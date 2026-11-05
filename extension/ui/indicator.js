// Top-bar menu (contracts/ui.md). Every item calls one of the actions passed in.
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export const Indicator = GObject.registerClass(
class StoicIndicator extends PanelMenu.Button {
    // actions: {toggleSidebar, setMeetingMode(bool), openPause, openEntries, openPreferences, deleteAll}
    _init(settings, actions) {
        super._init(0.0, 'Stoic Companion');
        this._settings = settings;

        this.add_child(new St.Icon({icon_name: 'accessories-dictionary-symbolic', style_class: 'system-status-icon'}));

        this._hideItem = this._addItem('', actions.toggleSidebar);
        this._meetingItem = new PopupMenu.PopupSwitchMenuItem('Meeting mode', false);
        this._meetingItem.accessible_name = 'Meeting mode';
        this._meetingItem.connect('toggled', (_item, state) => actions.setMeetingMode(state));
        this.menu.addMenuItem(this._meetingItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._addItem('The Pause', actions.openPause);
        this._addItem('Today\'s entries', actions.openEntries);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._addItem('Preferences', actions.openPreferences);
        this._addItem('Delete all personal data…', actions.deleteAll);

        this._hiddenId = settings.connect('changed::sidebar-hidden', () => this._syncHidden());
        this._syncHidden();
    }

    _addItem(label, action) {
        const item = new PopupMenu.PopupMenuItem(label);
        item.accessible_name = label;
        item.connect('activate', () => action());
        this.menu.addMenuItem(item);
        return item;
    }

    _syncHidden() {
        const label = this._settings.get_boolean('sidebar-hidden') ? 'Show sidebar' : 'Hide sidebar';
        this._hideItem.label.text = label;
        this._hideItem.accessible_name = label;
    }

    setMeetingMode(on) {
        this._meetingItem.setToggleState(on);
    }

    destroy() {
        this._settings.disconnect(this._hiddenId);
        super.destroy();
    }
});
