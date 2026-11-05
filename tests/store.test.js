// T008: lib/store.js against a temp dir (contracts/lib-api.md, contracts/journal-storage.md, data-model §2).
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {assert, assertEqual, assertDeepEqual} from './assert.js';
import {Store} from '../extension/lib/store.js';

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)$/;

// --- helpers ---------------------------------------------------------------

function sleep(ms) {
    return new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        resolve();
        return GLib.SOURCE_REMOVE;
    }));
}

async function waitFor(cond, what, ms = 3000) {
    for (let waited = 0; waited < ms; waited += 20) {
        if (cond())
            return;
        await sleep(20);
    }
    throw new Error(`timed out waiting for ${what}`);
}

function keyFor(date) {
    return date.format('%Y-%m-%d');
}

const today = () => keyFor(GLib.DateTime.new_now_local());
const yesterday = () => keyFor(GLib.DateTime.new_now_local().add_days(-1));

// A fresh, not-yet-existing root inside a new temp dir, so the store has to create it.
function freshRoot() {
    return Gio.File.new_for_path(GLib.dir_make_tmp('stoic-store-XXXXXX')).get_child('stoic-companion');
}

const daysDir = root => root.get_child('days');
const dayFile = (root, key) => daysDir(root).get_child(`${key}.json`);

function readBytes(file) {
    if (!file.query_exists(null))
        return null;
    const [, bytes] = file.load_contents(null);
    return new TextDecoder().decode(bytes);
}

// A first write creates the file in place, so a poll can catch it part-written: treat that as not there yet.
function readDay(root, key) {
    const text = readBytes(dayFile(root, key));
    try {
        return text === null ? null : JSON.parse(text);
    } catch {
        return null;
    }
}

function writeRaw(root, key, text) {
    GLib.mkdir_with_parents(daysDir(root).get_path(), 0o700);
    GLib.file_set_contents(dayFile(root, key).get_path(), text);
}

function mode(file) {
    return file.query_info('unix::mode', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null)
        .get_attribute_uint32('unix::mode') & 0o777;
}

function chmod(file, m) {
    file.set_attribute_uint32('unix::mode', m, Gio.FileQueryInfoFlags.NONE, null);
}

function listNames(dir) {
    const names = [];
    const iter = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    for (let info; (info = iter.next_file(null));)
        names.push(info.get_name());
    return names.sort();
}

function errorsOf(store) {
    const errors = [];
    store.connect('error', (_s, kind) => errors.push(kind));
    return errors;
}

async function openStore(root, key = today()) {
    const store = new Store(root);
    const errors = errorsOf(store);
    await store.loadDay(key);
    return {store, errors};
}

function pauseEntry(answers = {categoryId: 'anger'}) {
    return {kind: 'quick-reset', createdAt: GLib.DateTime.new_now_local().format_iso8601(), answers};
}

function entryById(root, key, id) {
    return readDay(root, key)?.entries.find(e => e.id === id);
}

function tryCall(fn) {
    try {
        fn();
    } catch {
        // Refusal may be a throw or a silent no-op; both are acceptable.
    }
}

// --- permissions (FR-039) --------------------------------------------------

export async function testModesAre0700And0600() {
    const root = freshRoot();
    const {store} = await openStore(root);
    store.addEntry(pauseEntry());
    await waitFor(() => dayFile(root, today()).query_exists(null), 'day file');
    assertEqual(mode(root), 0o700, 'root mode');
    assertEqual(mode(daysDir(root)), 0o700, 'days mode');
    assertEqual(mode(dayFile(root, today())), 0o600, 'day file mode');
}

// --- resumeOrStart / updateEntry / flush -----------------------------------

export async function testResumeOrStartWritesNothingUntilFirstUpdate() {
    const root = freshRoot();
    const {store} = await openStore(root);
    const entry = store.resumeOrStart('morning');
    assertEqual(entry.kind, 'morning', 'kind');
    assertEqual(entry.state, 'in-progress', 'state');
    await sleep(700);
    assertEqual(readDay(root, today()), null, 'a file was written before the first update');

    store.updateEntry(entry.id, {currentStep: 'challenges'});
    store.flush();
    const saved = entryById(root, today(), entry.id);
    assert(saved, 'entry not written after the first update');
    assertEqual(saved.currentStep, 'challenges', 'currentStep');
}

export async function testUpdateEntryDebounces500ms() {
    const root = freshRoot();
    const {store} = await openStore(root);
    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {answers: {challenges: 'A hard review.'}});
    await sleep(250);
    assertEqual(readDay(root, today()), null, 'written before 500 ms');

    // A second edit restarts the debounce.
    store.updateEntry(entry.id, {answers: {intention: 'Listen first.'}});
    await sleep(350);
    assertEqual(readDay(root, today()), null, 'debounce was not restarted by the second edit');

    await waitFor(() => entryById(root, today(), entry.id)?.answers.intention === 'Listen first.',
        'debounced write');
    assertDeepEqual(entryById(root, today(), entry.id).answers,
        {challenges: 'A hard review.', intention: 'Listen first.'}, 'answers merged');
}

export async function testFlushWritesSynchronously() {
    const root = freshRoot();
    const {store} = await openStore(root);
    const entry = store.resumeOrStart('evening');
    store.updateEntry(entry.id, {currentStep: 'went-well', answers: {wentWell: 'A calm meeting.'}});
    store.flush();
    const saved = entryById(root, today(), entry.id);
    assert(saved, 'flush did not write');
    assertEqual(saved.answers.wentWell, 'A calm meeting.', 'flushed answer');
    assertEqual(saved.state, 'in-progress', 'state');
    assertEqual(saved.kind, 'evening', 'kind');
    assert(ISO_WITH_OFFSET.test(saved.createdAt), `createdAt ${saved.createdAt}`);
    assert(ISO_WITH_OFFSET.test(saved.updatedAt), `updatedAt ${saved.updatedAt}`);
    assert(!saved.finishedAt, 'finishedAt set on an in-progress entry');
    const day = readDay(root, today());
    assertEqual(day.version, 1, 'version');
    assertEqual(day.date, today(), 'date');
}

export async function testBlankAnswersAreOmitted() {
    const root = freshRoot();
    const {store} = await openStore(root);
    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {answers: {challenges: 'Kept', intention: '', inControl: '   \n\t'}});
    store.flush();
    assertDeepEqual(entryById(root, today(), entry.id).answers, {challenges: 'Kept'}, 'blank answers stored');

    // Clearing a stored answer removes it rather than storing an empty string.
    store.updateEntry(entry.id, {answers: {challenges: '  '}});
    store.flush();
    assertDeepEqual(entryById(root, today(), entry.id).answers, {}, 'cleared answer kept');
}

export async function testResumeReturnsTodaysInProgressEntry() {
    const root = freshRoot();
    const first = await openStore(root);
    const entry = first.store.resumeOrStart('morning');
    first.store.updateEntry(entry.id, {currentStep: 'control', answers: {challenges: 'x'}});
    first.store.flush();

    const {store} = await openStore(root);
    const resumed = store.resumeOrStart('morning');
    assertEqual(resumed.id, entry.id, 'did not resume the in-progress entry');
    assertEqual(resumed.currentStep, 'control', 'currentStep');
}

// --- finishEntry / addEntry ------------------------------------------------

export async function testFinishEntrySetsFinishedAtAndDropsCurrentStep() {
    const root = freshRoot();
    const {store} = await openStore(root);
    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {currentStep: 'intention', answers: {intention: 'Be patient.'}});
    store.flush();
    store.finishEntry(entry.id);
    await waitFor(() => entryById(root, today(), entry.id)?.state === 'completed', 'finished entry');
    const saved = entryById(root, today(), entry.id);
    assert(ISO_WITH_OFFSET.test(saved.finishedAt), `finishedAt ${saved.finishedAt}`);
    assert(!('currentStep' in saved), 'currentStep kept after finish');
    assert(saved.createdAt <= saved.updatedAt && saved.updatedAt <= saved.finishedAt, 'timestamp order');
    assertEqual(saved.answers.intention, 'Be patient.', 'answers kept');

    // A completed practice is not resumed: starting again gives a new entry.
    const next = store.resumeOrStart('morning');
    assert(next.id !== entry.id, 'a completed entry was resumed');
}

export async function testAddEntryWritesAtOnceAsCompleted() {
    const root = freshRoot();
    const {store} = await openStore(root);
    store.addEntry(pauseEntry({categoryId: 'anger', text: 'Cut off in traffic', responseText: ''}));
    await waitFor(() => readDay(root, today())?.entries.length === 1, 'added entry', 450);
    const [saved] = readDay(root, today()).entries;
    assertEqual(saved.kind, 'quick-reset', 'kind');
    assertEqual(saved.state, 'completed', 'state');
    assert(typeof saved.id === 'string' && saved.id.length > 0, 'id');
    assert(ISO_WITH_OFFSET.test(saved.finishedAt), `finishedAt ${saved.finishedAt}`);
    assertDeepEqual(saved.answers, {categoryId: 'anger', text: 'Cut off in traffic'}, 'answers');
}

export async function testNoScoreOrStreakField() {
    const root = freshRoot();
    const {store} = await openStore(root);
    store.addEntry(pauseEntry());
    const entry = store.resumeOrStart('evening');
    store.updateEntry(entry.id, {answers: {wentWell: 'x'}});
    store.flush();
    const text = readBytes(dayFile(root, today()));
    assert(!/score|streak|count|percent|rating/i.test(text), 'a score-like field was written');
}

// --- unreadable files (R6) -------------------------------------------------

async function assertSetAside(text, label) {
    const root = freshRoot();
    const key = today();
    writeRaw(root, key, text);
    const {store, errors} = await openStore(root, key);

    const names = listNames(daysDir(root));
    const setAside = names.filter(n => new RegExp(`^${key}\\.json\\.unreadable-\\d+$`).test(n));
    assertEqual(setAside.length, 1, `${label}: set-aside files ${JSON.stringify(names)}`);
    assert(!names.includes(`${key}.json`), `${label}: original name still present`);
    assertDeepEqual(errors, ['unreadable'], `${label}: errors`);
    assertDeepEqual(store.entries(), [], `${label}: entries`);

    // A later save writes a new file and never touches the set-aside one.
    store.addEntry(pauseEntry());
    await waitFor(() => dayFile(root, key).query_exists(null), `${label}: new day file`);
    assertEqual(readBytes(daysDir(root).get_child(setAside[0])), text, `${label}: set-aside file changed`);
}

export async function testCorruptFileIsSetAside() {
    await assertSetAside('{"version": 1, "date": ', 'corrupt');
}

export async function testMissingFieldsAreSetAside() {
    await assertSetAside(JSON.stringify({version: 1, date: today()}), 'no entries');
}

export async function testDateMismatchIsSetAside() {
    await assertSetAside(JSON.stringify({version: 1, date: '1999-01-01', entries: []}), 'date mismatch');
}

// --- failed writes (FR-042, SC-006) ----------------------------------------

export async function testFailedWriteKeepsOldFileAndRetries() {
    if (GLib.get_user_name() === 'root')
        return; // root ignores directory modes, so the write cannot be made to fail
    const root = freshRoot();
    const key = today();
    const {store, errors} = await openStore(root, key);
    store.addEntry(pauseEntry({categoryId: 'anger'}));
    await waitFor(() => readDay(root, key)?.entries.length === 1, 'first write');
    const before = readBytes(dayFile(root, key));

    chmod(daysDir(root), 0o500);
    try {
        store.addEntry(pauseEntry({categoryId: 'fear'}));
        await waitFor(() => errors.includes('write'), 'write error');
        assertEqual(readBytes(dayFile(root, key)), before, 'old file changed by a failed write');
        assertDeepEqual(listNames(daysDir(root)), [`${key}.json`], 'stray files after a failed write');
    } finally {
        chmod(daysDir(root), 0o700);
    }

    // The unsaved entry stays in memory and goes out with the next change.
    store.addEntry(pauseEntry({categoryId: 'grief'}));
    await waitFor(() => readDay(root, key)?.entries.length === 3, 'retried write');
    assertDeepEqual(readDay(root, key).entries.map(e => e.answers.categoryId), ['anger', 'fear', 'grief'],
        'entries after retry');
}

// --- forward compatibility and refusals ------------------------------------

export async function testUnknownKindsAndFieldsSurviveRewrite() {
    const root = freshRoot();
    const key = today();
    const future = {id: 'f-1', kind: 'gratitude', state: 'completed', createdAt: `${key}T06:00:00+00:00`,
        updatedAt: `${key}T06:00:00+00:00`, finishedAt: `${key}T06:00:00+00:00`, answers: {x: 1}, mood: 'calm'};
    const morning = {id: 'm-1', kind: 'morning', state: 'in-progress', createdAt: `${key}T07:00:00+00:00`,
        updatedAt: `${key}T07:00:00+00:00`, currentStep: 'virtue', answers: {}, extra: {nested: [1, 2]}};
    writeRaw(root, key, JSON.stringify({version: 1, date: key, entries: [future, morning], note: 'kept'}));

    const {store} = await openStore(root, key);
    store.addEntry(pauseEntry());
    await waitFor(() => readDay(root, key)?.entries.length === 3, 'rewrite');
    const day = readDay(root, key);
    assertDeepEqual(day.entries[0], future, 'unknown kind');
    assertDeepEqual(day.entries[1].extra, {nested: [1, 2]}, 'unknown field');
    assertEqual(day.note, 'kept', 'unknown top-level field');
}

export async function testLaterVersionIsNeverRewritten() {
    const root = freshRoot();
    const key = today();
    const text = JSON.stringify({version: 2, date: key, entries: [
        {id: 'm-1', kind: 'morning', state: 'in-progress', createdAt: `${key}T07:00:00+00:00`,
            updatedAt: `${key}T07:00:00+00:00`, answers: {}},
    ]});
    writeRaw(root, key, text);
    const {store} = await openStore(root, key);

    tryCall(() => store.addEntry(pauseEntry()));
    tryCall(() => store.updateEntry('m-1', {answers: {challenges: 'x'}}));
    tryCall(() => store.flush());
    await sleep(700);
    assertEqual(readBytes(dayFile(root, key)), text, 'a version 2 file was rewritten');
}

export async function testPastDayEditIsRefused() {
    const root = freshRoot();
    const key = yesterday();
    const text = JSON.stringify({version: 1, date: key, entries: [
        {id: 'm-1', kind: 'morning', state: 'in-progress', createdAt: `${key}T07:00:00+00:00`,
            updatedAt: `${key}T07:00:00+00:00`, currentStep: 'virtue', answers: {}},
    ]});
    writeRaw(root, key, text);
    const {store} = await openStore(root, key);

    tryCall(() => store.updateEntry('m-1', {answers: {intention: 'late edit'}}));
    tryCall(() => store.finishEntry('m-1'));
    tryCall(() => store.flush());
    await sleep(700);
    assertEqual(readBytes(dayFile(root, key)), text, 'a past-day entry was edited');
    const held = store.entries().find(e => e.id === 'm-1');
    assert(held && held.state === 'in-progress' && !held.answers.intention, 'past-day entry changed in memory');
}

// --- deleteAll (FR-043, SC-009) --------------------------------------------

export async function testDeleteAllRemovesRootAndCancelsPendingWrites() {
    const root = freshRoot();
    const key = today();
    writeRaw(root, yesterday(), '{not json');
    const {store} = await openStore(root, yesterday()); // sets the corrupt file aside
    assert(listNames(daysDir(root)).some(n => n.includes('.unreadable-')), 'no set-aside file to delete');
    await store.loadDay(key);
    store.addEntry(pauseEntry());
    await waitFor(() => dayFile(root, key).query_exists(null), 'day file');

    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {answers: {intention: 'pending'}}); // still inside the debounce
    await store.deleteAll();
    assert(!root.query_exists(null), 'root still exists after deleteAll');
    assertDeepEqual(store.entries(), [], 'entries after deleteAll');

    await sleep(700);
    assert(!root.query_exists(null), 'a pending write recreated the root after deleteAll');
}
