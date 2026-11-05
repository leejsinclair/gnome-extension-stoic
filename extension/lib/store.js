// The only module that touches personal data on disk (contracts/lib-api.md, journal-storage.md, R5–R7).
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

const VERSION = 1;
const DEBOUNCE_MS = 500;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const PRACTICES = ['morning', 'evening'];
const PAUSES = ['quick-reset', 'deep-reflection'];
const WRITE_FLAGS = Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const now = () => GLib.DateTime.new_now_local().format('%Y-%m-%dT%H:%M:%S%:z');
const todayKey = () => GLib.DateTime.new_now_local().format('%Y-%m-%d');
const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function isBlank(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === 'string')
        return value.trim() === '';
    return Array.isArray(value) && value.length === 0;
}

// Merges a patch into answers, dropping blank values instead of storing them.
function mergeAnswers(answers, patch) {
    for (const [key, value] of Object.entries(patch ?? {})) {
        if (isBlank(value))
            delete answers[key];
        else
            answers[key] = clone(value);
    }
    return answers;
}

function chmod(file, mode) {
    file.set_attribute_uint32('unix::mode', mode, Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
}

function deleteRecursive(file) {
    const type = file.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    if (type === Gio.FileType.UNKNOWN)
        return;
    if (type === Gio.FileType.DIRECTORY) {
        const iter = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        for (let info; (info = iter.next_file(null));)
            deleteRecursive(file.get_child(info.get_name()));
        iter.close(null);
    }
    file.delete(null);
}

// Returns the day document, or null when it breaks a rule that makes it unreadable (data-model §2.2).
function parseDay(text, key) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (!isObject(data) || !Number.isInteger(data.version) || data.version < 1 ||
        data.date !== key || !Array.isArray(data.entries))
        return null;
    return data;
}

export const Store = GObject.registerClass({
    Signals: {
        'changed': {},
        'error': {param_types: [GObject.TYPE_STRING]},
    },
}, class Store extends GObject.Object {
    constructor(rootDir) {
        super();
        this._root = rootDir;
        this._days = rootDir.get_child('days');
        this._day = null;           // {key, file, data, readOnly, dirty}
        this._held = new Map();     // kind -> entry started but not yet updated
        this._timer = 0;
        this._writes = new Map();   // path -> {cancellable, done, next}
        this._dirsReady = false;
        this._loadToken = 0;
        this._epoch = 0;
    }

    async loadDay(key) {
        if (!DATE_KEY.test(key))
            throw new Error(`Invalid date key ${key}`);
        if (this._day?.dirty)
            this._saveNow();        // the old day's pending answers go out before switching
        this._cancelTimer();
        this._held.clear();

        const token = ++this._loadToken;
        const file = this._days.get_child(`${key}.json`);
        const day = {key, file, data: {version: VERSION, date: key, entries: []}, readOnly: false, dirty: false};
        let unreadable = false;

        let text = null;
        try {
            const [bytes] = await new Promise((resolve, reject) => {
                file.load_contents_async(null, (f, res) => {
                    try {
                        const [, contents, etag] = f.load_contents_finish(res);
                        resolve([contents, etag]);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            text = decoder.decode(bytes);
        } catch (e) {
            if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
                // Present but not readable: never write over it.
                day.readOnly = true;
                unreadable = true;
            }
        }
        if (token !== this._loadToken)
            return this.entries();

        if (text !== null) {
            const data = parseDay(text, key);
            if (data) {
                day.data = data;
                day.readOnly = data.version > VERSION;
            } else {
                unreadable = true;
                if (!this._setAside(file))
                    day.readOnly = true;
            }
        }

        this._day = day;
        if (unreadable)
            this.emit('error', 'unreadable');
        this.emit('changed');
        return this.entries();
    }

    entries() {
        return this._day ? clone(this._day.data.entries.filter(isObject)) : [];
    }

    resumeOrStart(kind) {
        if (!PRACTICES.includes(kind))
            throw new Error(`Unknown practice ${kind}`);
        const found = this._editable() &&
            this._day.data.entries.findLast(e => isObject(e) && e.kind === kind && e.state === 'in-progress');
        if (found)
            return clone(found);
        if (!this._held.has(kind)) {
            const at = now();
            this._held.set(kind, {
                id: GLib.uuid_string_random(), kind, state: 'in-progress',
                createdAt: at, updatedAt: at, answers: {},
            });
        }
        return clone(this._held.get(kind));
    }

    updateEntry(id, patch = {}) {
        const entry = this._liveEntry(id);
        if (!entry || entry.state !== 'in-progress')
            return false;
        if (typeof patch.currentStep === 'string')
            entry.currentStep = patch.currentStep;
        mergeAnswers(entry.answers, patch.answers);
        entry.updatedAt = now();
        this._changed();
        this._scheduleSave();
        return true;
    }

    finishEntry(id) {
        const entry = this._liveEntry(id);
        if (!entry || entry.state !== 'in-progress')
            return false;
        const at = now();
        entry.state = 'completed';
        entry.updatedAt = at;
        entry.finishedAt = at;
        delete entry.currentStep;
        this._changed();
        this._saveNow();
        return true;
    }

    addEntry({kind, createdAt, answers} = {}) {
        if (!PAUSES.includes(kind))
            throw new Error(`Unknown Pause kind ${kind}`);
        if (!this._editable())
            return false;
        const at = now();
        this._day.data.entries.push({
            id: GLib.uuid_string_random(), kind, state: 'completed',
            createdAt: createdAt ?? at, updatedAt: at, finishedAt: at,
            answers: mergeAnswers({}, answers),
        });
        this._changed();
        this._saveNow();
        return true;
    }

    flush() {
        this._cancelTimer();
        const day = this._day;
        if (!day?.dirty || day.readOnly)
            return;
        const text = this._serialise(day);
        const pending = this._writes.get(day.file.get_path());
        if (pending)
            pending.next = text;    // an async write still in flight is followed by the latest text
        try {
            this._ensureDirs();
            day.file.replace_contents(encoder.encode(text), null, false, WRITE_FLAGS, null);
            day.dirty = false;
        } catch (e) {
            this._writeFailed(e);
        }
    }

    async deleteAll() {
        this._cancelTimer();
        this._epoch++;
        const writes = [...this._writes.values()];
        for (const w of writes) {
            w.next = null;
            w.cancellable.cancel();
        }
        await Promise.all(writes.map(w => w.done));
        this._writes.clear();
        this._held.clear();
        if (this._day)
            this._day = {...this._day, data: {version: VERSION, date: this._day.key, entries: []}, readOnly: false, dirty: false};
        this._dirsReady = false;
        try {
            deleteRecursive(this._root);
        } finally {
            this.emit('changed');
        }
    }

    // --- internals ---------------------------------------------------------

    _editable() {
        return Boolean(this._day && !this._day.readOnly && this._day.key === todayKey());
    }

    // The stored entry for id, promoting a held practice entry on its first update. Null when refused.
    _liveEntry(id) {
        if (!this._editable())
            return null;
        const stored = this._day.data.entries.find(e => isObject(e) && e.id === id);
        if (stored)
            return PRACTICES.includes(stored.kind) ? stored : null;
        for (const [kind, held] of this._held) {
            if (held.id === id) {
                this._held.delete(kind);
                this._day.data.entries.push(held);
                return held;
            }
        }
        return null;
    }

    _changed() {
        this._day.dirty = true;
        this.emit('changed');
    }

    _setAside(file) {
        const base = file.get_basename();
        for (let ts = Math.floor(Date.now() / 1000); ; ts++) {
            const target = file.get_parent().get_child(`${base}.unreadable-${ts}`);
            try {
                file.move(target, Gio.FileCopyFlags.NOFOLLOW_SYMLINKS, null, null);
            } catch (e) {
                if (e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
                    continue;
                return false;
            }
            try {
                chmod(target, 0o600);
            } catch {
                // Set aside is what matters; the mode is best effort.
            }
            return true;
        }
    }

    _ensureDirs() {
        if (this._dirsReady && this._days.query_exists(null))
            return;
        GLib.mkdir_with_parents(this._days.get_path(), 0o700);
        chmod(this._root, 0o700);
        chmod(this._days, 0o700);
        this._dirsReady = true;
    }

    _serialise(day) {
        return `${JSON.stringify(day.data, null, 2)}\n`;
    }

    _cancelTimer() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = 0;
        }
    }

    _scheduleSave() {
        this._cancelTimer();
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
            this._timer = 0;
            this._saveNow();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Starts an async atomic write of the current day; one write per file at a time, the latest winning.
    _saveNow() {
        this._cancelTimer();
        const day = this._day;
        if (!day?.dirty || day.readOnly)
            return;
        day.dirty = false;
        const text = this._serialise(day);
        const path = day.file.get_path();
        const pending = this._writes.get(path);
        if (pending) {
            pending.next = text;
            pending.day = day;
            return;
        }
        this._startWrite(day, text);
    }

    _startWrite(day, text) {
        const path = day.file.get_path();
        const epoch = this._epoch;
        const cancellable = new Gio.Cancellable();
        let resolve;
        const write = {cancellable, next: null, day, done: new Promise(r => (resolve = r))};
        this._writes.set(path, write);

        try {
            this._ensureDirs();
        } catch (e) {
            this._writes.delete(path);
            resolve();
            day.dirty = true;
            this._writeFailed(e);
            return;
        }

        day.file.replace_contents_bytes_async(new GLib.Bytes(encoder.encode(text)), null, false,
            WRITE_FLAGS, cancellable, (file, res) => {
                let error = null;
                try {
                    file.replace_contents_finish(res);
                } catch (e) {
                    error = e;
                }
                this._writes.delete(path);
                resolve();
                if (epoch !== this._epoch)
                    return;
                if (error) {
                    write.day.dirty = true;     // kept in memory, retried on the next change
                    if (!error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        this._writeFailed(error);
                }
                if (write.next !== null)
                    this._startWrite(write.day, write.next);
            });
    }

    _writeFailed(error) {
        console.warn(`Stoic Companion: could not save journal: ${error.message}`);
        this.emit('error', 'write');
    }
});
