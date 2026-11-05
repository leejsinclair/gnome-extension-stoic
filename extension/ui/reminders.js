// Daily reminder and storage notices. Texts are fixed (contracts/ui.md) and never carry journal content (FR-045).
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import {reminderDue} from '../lib/today.js';

const TITLE = 'Stoic Companion';
const TEXT = {
    morning: 'Morning practice is here when you want it.',
    evening: 'Evening reflection is here when you want it.',
    write: 'Stoic Companion could not save. Your earlier records are safe.',
    unreadable: 'Stoic Companion could not read one day\'s records. The file was set aside and kept.',
};

export class Reminders {
    constructor() {
        this._source = null;
        this._lastFired = {morning: null, evening: null};   // memory only: a missed reminder is never sent late (R9)
        this._writeNotified = false;
    }

    // Called once per wall-clock minute with the current TodayView.
    tick(now, view, settings) {
        const nowHHMM = now.format('%H:%M');
        for (const kind of ['morning', 'evening']) {
            const reminder = {
                enabled: settings.get_boolean(`${kind}-reminder-enabled`),
                time: settings.get_string(`${kind}-reminder-time`),
            };
            if (reminderDue(reminder, nowHHMM, view[kind], this._lastFired[kind], view.dateKey)) {
                this._lastFired[kind] = view.dateKey;
                this._notify(TEXT[kind]);
            }
        }
    }

    // kind: 'write' (shown at most once per session) or 'unreadable'.
    notifyStoreError(kind) {
        if (kind === 'write') {
            if (this._writeNotified)
                return;
            this._writeNotified = true;
        }
        this._notify(TEXT[kind] ?? TEXT.write);
    }

    _notify(body) {
        // The Shell destroys a source once its last notification goes, so it is made on demand.
        if (!this._source) {
            this._source = new MessageTray.Source({title: TITLE, iconName: 'accessories-dictionary-symbolic'});
            this._source.connect('destroy', () => (this._source = null));
            Main.messageTray.add(this._source);
        }
        this._source.addNotification(new MessageTray.Notification({source: this._source, title: TITLE, body}));
    }

    destroy() {
        this._source?.destroy();
        this._source = null;
    }
}
