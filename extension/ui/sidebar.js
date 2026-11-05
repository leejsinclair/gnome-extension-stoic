// The sidebar chrome actor: five static sections rendered from one TodayView (contracts/ui.md, R2, R10, R11).
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const VERTICAL = Clutter.Orientation.VERTICAL;
const STATE_LABELS = {'not-started': 'Not started', 'in-progress': 'In progress', 'completed': 'Completed'};
const BACKGROUND = {light: [250, 250, 250], dark: [36, 36, 36]};
const APPEARANCE_KEYS = ['sidebar-position', 'sidebar-width', 'background-opacity', 'color-scheme'];

export const Sidebar = GObject.registerClass({
    Signals: {'pause-activated': {}, 'practice-activated': {}},
}, class StoicSidebar extends St.BoxLayout {
    _init(settings) {
        super._init({
            orientation: VERTICAL, style_class: 'stoic-sidebar', reactive: true,
            accessible_name: 'Stoic Companion sidebar',
        });
        this._settings = settings;
        this._interface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._inChrome = false;

        this._virtue = this._section('Today\'s Virtue', 'stoic-section-virtue', ['stoic-virtue-name', 'stoic-section-detail']);
        this._passage = this._section('A Thought to Carry', 'stoic-section-passage', ['stoic-passage-text', 'stoic-passage-cite']);
        this._reminder = this._section('Stoic Reminder', 'stoic-section-reminder', ['stoic-reminder-text']);

        this._pause = this._section('The Pause', 'stoic-section-pause', []);
        const pauseButton = new St.Button({
            label: 'The Pause', style_class: 'stoic-pause-button', can_focus: true,
            accessible_name: 'The Pause', x_expand: true,
        });
        pauseButton.connect('clicked', () => this.emit('pause-activated'));
        this._pause.actor.add_child(pauseButton);
        this._pause.actor.accessible_name = 'The Pause';

        // The practice section is one activatable button holding the two chips (FR-053).
        const practice = new St.Button({
            style_class: 'stoic-section stoic-section-practice', can_focus: true, x_expand: true,
        });
        const practiceBox = new St.BoxLayout({orientation: VERTICAL, x_expand: true});
        practiceBox.add_child(this._wrapLabel('Daily Practice Status', 'stoic-section-title'));
        // Stacked: two chips side by side do not fit the narrowest sidebar.
        const chips = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-chips'});
        this._morningChip = new St.Label({style_class: 'stoic-chip', x_align: Clutter.ActorAlign.START});
        this._eveningChip = new St.Label({style_class: 'stoic-chip', x_align: Clutter.ActorAlign.START});
        chips.add_child(this._morningChip);
        chips.add_child(this._eveningChip);
        practiceBox.add_child(chips);
        practice.set_child(practiceBox);
        practice.connect('clicked', () => this.emit('practice-activated'));
        this._practice = practice;
        this.add_child(practice);

        this._settingsIds = APPEARANCE_KEYS.map(key =>
            settings.connect(`changed::${key}`, () => this._relayout()));
        this._settingsIds.push(settings.connect('changed::sidebar-hidden', () => this._syncHidden()));
        this._schemeId = this._interface.connect('changed::color-scheme', () => this._relayout());
        this._workareasId = global.display.connect('workareas-changed', () => this._relayout());
        this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._relayout());

        Main.ctrlAltTabManager.addGroup(this, 'Stoic Companion', 'accessories-dictionary-symbolic');
        this._syncHidden();
    }

    _wrapLabel(text, style_class) {
        const label = new St.Label({text, style_class});
        label.clutter_text.line_wrap = true;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    _section(title, styleClass, bodyClasses) {
        const actor = new St.BoxLayout({
            orientation: VERTICAL, style_class: `stoic-section ${styleClass}`, can_focus: true, reactive: true,
        });
        actor.add_child(this._wrapLabel(title, 'stoic-section-title'));
        const bodies = bodyClasses.map(cls => {
            const label = this._wrapLabel('', `stoic-section-body ${cls}`);
            actor.add_child(label);
            return label;
        });
        this.add_child(actor);
        return {title, actor, bodies};
    }

    _fill(section, texts) {
        section.bodies.forEach((label, i) => (label.text = texts[i] ?? ''));
        section.actor.accessible_name = `${section.title}. ${texts.filter(Boolean).join(' ')}`;
    }

    // Sets text only: nothing animates (FR-013).
    render(view) {
        this._fill(this._virtue, [view.virtue.name, view.virtue.definition]);
        const p = view.passage;
        this._fill(this._passage, p ? [p.text, `${p.author}, ${p.work}`] : []);
        this._fill(this._reminder, [view.reminder?.text ?? '']);

        for (const [chip, kind, name] of [[this._morningChip, 'morning', 'Morning'], [this._eveningChip, 'evening', 'Evening']]) {
            chip.text = `${name}: ${STATE_LABELS[view[kind]]}`;
            chip.remove_style_class_name('stoic-chip-in-progress');
            chip.remove_style_class_name('stoic-chip-completed');
            if (view[kind] !== 'not-started')
                chip.add_style_class_name(`stoic-chip-${view[kind]}`);
        }
        this._practice.accessible_name = `Daily Practice Status. ${this._morningChip.text}. ${this._eveningChip.text}`;
    }

    _scheme() {
        const scheme = this._settings.get_string('color-scheme');
        if (scheme !== 'system')
            return scheme;
        return this._interface.get_string('color-scheme') === 'prefer-dark' ? 'dark' : 'light';
    }

    _relayout() {
        const scheme = this._scheme();
        this.remove_style_class_name('stoic-sidebar-light');
        this.remove_style_class_name('stoic-sidebar-dark');
        this.add_style_class_name(`stoic-sidebar-${scheme}`);
        // Opacity applies to the background only, so text stays opaque (R11).
        const [r, g, b] = BACKGROUND[scheme];
        this.style = `background-color: rgba(${r}, ${g}, ${b}, ${this._settings.get_double('background-opacity')});`;

        if (!this._inChrome)
            return;
        const area = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        if (!area)
            return;
        const width = Math.min(Math.max(this._settings.get_int('sidebar-width'), 200), 480, Math.floor(area.width / 2));
        const left = this._settings.get_string('sidebar-position') === 'left';
        this.set_position(left ? area.x : area.x + area.width - width, area.y);
        this.set_size(width, area.height);
    }

    // The Shell owns `visible` on a fullscreen-tracked actor, so user hiding goes through chrome (R2).
    setHidden(hidden) {
        if (hidden && this._inChrome) {
            Main.layoutManager.removeChrome(this);
            this._inChrome = false;
        } else if (!hidden && !this._inChrome) {
            Main.layoutManager.addChrome(this, {affectsStruts: false, trackFullscreen: true});
            this._inChrome = true;
        }
        this._relayout();
    }

    _syncHidden() {
        this.setHidden(this._settings.get_boolean('sidebar-hidden'));
    }

    focus() {
        if (this._inChrome)
            this.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
    }

    destroy() {
        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this._interface.disconnect(this._schemeId);
        global.display.disconnect(this._workareasId);
        Main.layoutManager.disconnect(this._monitorsId);
        Main.ctrlAltTabManager.removeGroup(this);
        if (this._inChrome)
            Main.layoutManager.removeChrome(this);
        this._inChrome = false;
        super.destroy();
    }
});
