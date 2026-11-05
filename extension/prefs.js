// Preferences window. It touches GSettings only, never personal data (R7).
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const SHORTCUTS = [
    ['toggle-sidebar', 'Show or hide the sidebar'],
    ['toggle-meeting-mode', 'Turn Meeting mode on or off'],
    ['open-pause', 'Open The Pause'],
    ['focus-sidebar', 'Move keyboard focus to the sidebar'],
];

export default class StoicPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;    // keep alive for the window's lifetime
        window.add(this._appearancePage(settings));
        window.add(this._shortcutsPage(settings, window));
        window.add(this._remindersPage(settings));
    }

    _appearancePage(settings) {
        const page = new Adw.PreferencesPage({title: 'Appearance', icon_name: 'preferences-desktop-appearance-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Sidebar'});
        page.add(group);

        group.add(this._comboRow(settings, 'sidebar-position', 'Position', [['left', 'Left'], ['right', 'Right']]));

        const width = new Adw.SpinRow({
            title: 'Width', subtitle: 'In pixels, from 200 to 480',
            adjustment: new Gtk.Adjustment({lower: 200, upper: 480, step_increment: 10, page_increment: 50}),
        });
        settings.bind('sidebar-width', width, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(width);

        const opacity = new Adw.SpinRow({
            title: 'Background opacity', subtitle: 'Text always stays fully opaque', digits: 2,
            adjustment: new Gtk.Adjustment({lower: 0.5, upper: 1.0, step_increment: 0.05, page_increment: 0.1}),
        });
        settings.bind('background-opacity', opacity, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(opacity);

        group.add(this._comboRow(settings, 'color-scheme', 'Color scheme',
            [['system', 'Follow system'], ['light', 'Light'], ['dark', 'Dark']]));
        return page;
    }

    _comboRow(settings, key, title, choices) {
        const row = new Adw.ComboRow({title, model: Gtk.StringList.new(choices.map(c => c[1]))});
        const sync = () => (row.selected = Math.max(0, choices.findIndex(c => c[0] === settings.get_string(key))));
        sync();
        settings.connect(`changed::${key}`, sync);
        row.connect('notify::selected', () => settings.set_string(key, choices[row.selected][0]));
        return row;
    }

    _shortcutsPage(settings, window) {
        const page = new Adw.PreferencesPage({title: 'Shortcuts', icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Keyboard shortcuts', description: 'Unset by default, so they never clash with your own'});
        page.add(group);

        for (const [key, title] of SHORTCUTS) {
            const row = new Adw.ActionRow({title});
            const label = new Gtk.Label({valign: Gtk.Align.CENTER, css_classes: ['dim-label']});
            const sync = () => {
                const [ok, keyval, mods] = Gtk.accelerator_parse(settings.get_strv(key)[0] ?? '');
                label.label = ok && keyval ? Gtk.accelerator_get_label(keyval, mods) : 'Disabled';
            };
            sync();
            settings.connect(`changed::${key}`, sync);

            const set = new Gtk.Button({label: 'Set', valign: Gtk.Align.CENTER, tooltip_text: `Set shortcut: ${title}`});
            set.update_property([Gtk.AccessibleProperty.LABEL], [`Set shortcut: ${title}`]);
            set.connect('clicked', () => this._captureShortcut(window, title, accel => settings.set_strv(key, accel ? [accel] : [])));
            const clear = new Gtk.Button({icon_name: 'edit-clear-symbolic', valign: Gtk.Align.CENTER, tooltip_text: `Clear shortcut: ${title}`});
            clear.update_property([Gtk.AccessibleProperty.LABEL], [`Clear shortcut: ${title}`]);
            clear.connect('clicked', () => settings.set_strv(key, []));

            row.add_suffix(label);
            row.add_suffix(set);
            row.add_suffix(clear);
            group.add(row);
        }
        return page;
    }

    // libadwaita has no shortcut editor, so a small dialog captures one key combination (R10).
    _captureShortcut(window, title, onAccel) {
        const dialog = new Adw.AlertDialog({
            heading: title,
            body: 'Press the new shortcut, or Escape to cancel. Backspace clears it.',
        });
        dialog.add_response('cancel', 'Cancel');
        const controller = new Gtk.EventControllerKey();
        controller.connect('key-pressed', (_c, keyval, _keycode, state) => {
            const mods = state & Gtk.accelerator_get_default_mod_mask();
            if (keyval === Gdk.KEY_Escape && !mods) {
                dialog.close();
                return true;
            }
            if (keyval === Gdk.KEY_BackSpace && !mods) {
                onAccel(null);
                dialog.close();
                return true;
            }
            const accel = Gtk.accelerator_name(keyval, mods);
            const [ok, key] = Gtk.accelerator_parse(accel);
            if (!ok || !key || !Gtk.accelerator_valid(keyval, mods))
                return true;    // a lone modifier or an unusable key: keep listening
            onAccel(accel);
            dialog.close();
            return true;
        });
        dialog.add_controller(controller);
        dialog.present(window);
    }

    _remindersPage(settings) {
        const page = new Adw.PreferencesPage({title: 'Reminders', icon_name: 'alarm-symbolic'});
        for (const [kind, title] of [['morning', 'Morning practice'], ['evening', 'Evening reflection']]) {
            const group = new Adw.PreferencesGroup({title, description: 'A gentle notification, off by default'});
            const enabled = new Adw.SwitchRow({title: 'Remind me'});
            settings.bind(`${kind}-reminder-enabled`, enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(enabled);

            // Only a valid 24-hour HH:MM is ever stored.
            const time = new Adw.EntryRow({title: 'Time (HH:MM, 24-hour)', show_apply_button: true});
            time.text = settings.get_string(`${kind}-reminder-time`);
            time.connect('changed', () => {
                if (TIME_RE.test(time.text))
                    time.remove_css_class('error');
                else
                    time.add_css_class('error');
            });
            time.connect('apply', () => {
                if (TIME_RE.test(time.text))
                    settings.set_string(`${kind}-reminder-time`, time.text);
            });
            group.add(time);
            page.add(group);
        }
        return page;
    }
}
