// Composition root: wires content, store, sidebar, indicator, keybindings, clock and reminders (plan.md).
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GnomeDesktop from 'gi://GnomeDesktop';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {loadContent, validateContent} from './lib/content.js';
import {Store} from './lib/store.js';
import {buildTodayView, dateKey, defaultPractice} from './lib/today.js';
import {FlowDialog} from './ui/flowDialog.js';
import {Indicator} from './ui/indicator.js';
import {Reminders} from './ui/reminders.js';
import {Sidebar} from './ui/sidebar.js';

export default class StoicCompanion extends Extension {
    enable() {
        // The Shell makes one instance per process: Meeting mode survives lock, not a new session (R3, FR-014).
        this._meetingMode ??= false;

        try {
            this._content = loadContent(this.dir.get_child('content'));
        } catch (e) {
            console.error(`Stoic Companion: could not load bundled content: ${e.message}`);
            return;
        }
        const problems = validateContent(this._content);
        if (problems.length > 0) {
            console.error(`Stoic Companion: bundled content is invalid:\n${problems.join('\n')}`);
            this._content = null;
            return;
        }

        this._settings = this.getSettings();
        this._reminders = new Reminders();
        this._store = new Store(Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_data_dir(), 'stoic-companion'])));
        this._storeIds = [
            this._store.connect('changed', () => this._refresh()),
            this._store.connect('error', (_store, kind) => this._reminders.notifyStoreError(kind)),
        ];

        this._sidebar = new Sidebar(this._settings);
        this._sidebar.connect('pause-activated', () => this._openFlow('pause'));
        this._sidebar.connect('practice-activated', () => this._openFlow(defaultPractice(GLib.DateTime.new_now_local())));

        this._indicator = new Indicator(this._settings, {
            toggleSidebar: () => this._toggleSidebar(),
            setMeetingMode: on => this._setMeetingMode(on),
            openPause: () => this._openFlow('pause'),
            openEntries: () => this._openEntries().catch(logError),
            openPreferences: () => this.openPreferences(),
            deleteAll: () => this._deleteAll().catch(logError),
        });
        this._indicator.setMeetingMode(this._meetingMode);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._keybindings = {
            'toggle-sidebar': () => this._toggleSidebar(),
            'toggle-meeting-mode': () => this._setMeetingMode(!this._meetingMode),
            'open-pause': () => this._openFlow('pause'),
            'focus-sidebar': () => this._sidebar.focus(),
        };
        for (const [name, handler] of Object.entries(this._keybindings)) {
            Main.wm.addKeybinding(name, this._settings, Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, handler);
        }

        // WallClock follows suspend and time-zone changes; a monotonic timeout would miss midnight (R9).
        this._clock = new GnomeDesktop.WallClock();
        this._clockId = this._clock.connect('notify::clock', () => this._onClockTick());

        this._key = dateKey(GLib.DateTime.new_now_local());
        this._refresh();
        this._store.loadDay(this._key).catch(logError);
    }

    _refresh() {
        this._view = buildTodayView({
            content: this._content, key: this._key, entries: this._store.entries(), meetingMode: this._meetingMode,
        });
        this._sidebar.render(this._view);
    }

    _onClockTick() {
        const now = GLib.DateTime.new_now_local();
        const key = dateKey(now);
        if (key !== this._key) {
            this._store.flush();
            this._key = key;
            this._store.loadDay(key).catch(logError);   // emits 'changed', which refreshes
        }
        this._reminders.tick(now, this._view, this._settings);
    }

    _toggleSidebar() {
        this._settings.set_boolean('sidebar-hidden', !this._settings.get_boolean('sidebar-hidden'));
    }

    _setMeetingMode(on) {
        this._meetingMode = on;
        this._indicator.setMeetingMode(on);
        this._refresh();
    }

    // Callers close any open dialog first, so only one is ever open.
    _track(dialog) {
        this._dialog = dialog;
        dialog?.connect('destroy', () => {
            if (this._dialog === dialog)
                this._dialog = null;
        });
        return dialog;
    }

    _openFlow(flowId) {
        this._dialog?.close();
        this._track(FlowDialog.open(flowId, {store: this._store, content: this._content, view: this._view}));
    }

    // Loaded on first use, so the sidebar runs without it (tasks.md, US1).
    async _openEntries() {
        const {EntriesDialog} = await import('./ui/entriesDialog.js');
        if (!this._store)
            return;
        this._dialog?.close();
        const dialog = this._track(new EntriesDialog({store: this._store, content: this._content}));
        if (!dialog.open())
            dialog.destroy();
    }

    // Confirmed, then: close any open flow, cancel pending writes, delete the root, refresh (data-model §2.6).
    async _deleteAll() {
        const {DeleteAllDialog} = await import('./ui/entriesDialog.js');
        if (!this._store)
            return;
        this._dialog?.close();      // any open flow is closed (and flushed) before confirming
        const dialog = this._track(new DeleteAllDialog());
        if (!dialog.open())
            dialog.destroy();       // resolves the result to false
        const confirmed = await dialog.result;
        if (!confirmed || !this._store)
            return;
        const store = this._store;
        await store.deleteAll();
        if (this._store === store)
            this._refresh();
    }

    disable() {
        this._dialog?.close();
        this._dialog = null;
        if (!this._content)
            return;

        for (const name of Object.keys(this._keybindings))
            Main.wm.removeKeybinding(name);
        this._keybindings = null;
        this._clock.disconnect(this._clockId);
        this._clock = null;

        for (const id of this._storeIds)
            this._store.disconnect(id);
        this._store.flush();
        this._store = null;

        this._sidebar.destroy();
        this._sidebar = null;
        this._indicator.destroy();
        this._indicator = null;
        this._reminders.destroy();
        this._reminders = null;
        this._settings = null;
        this._content = null;
        this._view = null;
    }
}
