// One modal dialog that runs any flow from lib/flows.js (R4, contracts/ui.md).
// A Pause session lives only in this dialog's memory until Save (FR-025).
import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import {guidanceFor} from '../lib/content.js';
import {getFlow} from '../lib/flows.js';
import {dailyVirtue, passageFor} from '../lib/today.js';

const VERTICAL = Clutter.Orientation.VERTICAL;

// Labels for steps that hold more than one text field. A lone field takes the step prompt as its name.
export const FIELD_LABELS = {
    text: 'In your own words',
    inControl: 'Within my control',
    notInControl: 'Not within my control',
    virtueNotes: 'How they could help',
    responseText: 'Or your own response',
};

// Category guidance shown on each Pause step once a category is chosen (FR-022).
const GUIDANCE = {
    'quick-reset': {identify: ['acknowledge'], control: ['judgement', 'control']},
    'deep-reflection': {recognise: ['acknowledge'], judgement: ['judgement'], control: ['control'], virtues: ['virtue']},
};

export const FlowDialog = GObject.registerClass(
class StoicFlowDialog extends ModalDialog.ModalDialog {
    // flowId is a FLOW_IDS entry, or 'pause' for the Quick Reset / Deep Reflection chooser.
    // Returns null when the Shell cannot take the modal grab.
    static open(flowId, deps) {
        const dialog = new FlowDialog(flowId, deps);
        if (dialog.open())
            return dialog;
        dialog.destroy();
        return null;
    }

    _init(flowId, {store, content, view}) {
        super._init({styleClass: 'stoic-flow-dialog', shouldFadeIn: false, shouldFadeOut: false});
        this._store = store;
        this._content = content;
        this._view = view;

        const keys = new Clutter.KeyController();
        keys.connect('key-press', () => {
            if (keys.get_key()[1] !== Clutter.KEY_Escape)
                return Clutter.EVENT_PROPAGATE;
            this.close();
            return Clutter.EVENT_STOP;
        });
        this.add_action_full('stoic-flow-escape', Clutter.EventPhase.CAPTURE, keys);
        // Practice answers are already saved as typed; closing only pushes out the last keystrokes.
        this.connect('destroy', () => this._practice && this._store.flush());

        if (flowId === 'pause')
            this._showChooser();
        else
            this._start(flowId);
    }

    _showChooser() {
        this._flow = null;
        this.contentLayout.destroy_all_children();
        this.clearButtons();
        this.contentLayout.add_child(this._label('The Pause', 'stoic-flow-title'));
        const box = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-chooser'});
        const [quick, deep] = ['quick-reset', 'deep-reflection'].map(id =>
            this._button(getFlow(id).title, 'stoic-flow-chooser-button', () => this._start(id), {x_expand: true}));
        box.add_child(quick);
        box.add_child(deep);
        this.contentLayout.add_child(box);
        this._focusOn(quick);   // Quick Reset is preselected: Enter starts it (US2-AS1)
    }

    _start(flowId) {
        if (this._practice)
            this._store.flush();
        this._flow = getFlow(flowId);
        this._practice = this._flow.persist === 'as-you-go';
        this._answers = {};
        this._step = 0;
        this._openedAt = GLib.DateTime.new_now_local().format('%Y-%m-%dT%H:%M:%S%:z');   // as the store writes it
        this._saved = false;
        this._saveMessage = null;
        if (this._practice) {
            // Today's in-progress entry resumes at its step; a new one stays in memory until the first change.
            const entry = this._store.resumeOrStart(flowId);
            this._entryId = entry.id;
            this._answers = {...entry.answers};
            this._step = Math.max(0, this._flow.steps.findIndex(s => s.id === entry.currentStep));
        }
        this._render();
    }

    // --- rendering --------------------------------------------------------

    _render() {
        const flow = this._flow;
        const step = flow.steps[this._step];
        const last = this._step === flow.steps.length - 1;
        this.contentLayout.destroy_all_children();
        this.clearButtons();
        this._syncers = [];
        this._first = null;

        const header = new St.BoxLayout({style_class: 'stoic-flow-header'});
        header.add_child(this._label(`${flow.title} · Step ${this._step + 1} of ${flow.steps.length}`,
            'stoic-flow-title', {x_expand: true, y_align: Clutter.ActorAlign.CENTER}));
        const response = flow.steps.findIndex(s => s.id === 'response');
        if (flow.persist === 'on-save' && this._step < response)
            header.add_child(this._button('Skip to response', 'stoic-flow-header-button', () => this._go(response)));
        if (flow.switchTo) {
            header.add_child(this._button(`Switch to ${getFlow(flow.switchTo).title}`, 'stoic-flow-header-button',
                () => this._start(flow.switchTo)));
        }
        this.contentLayout.add_child(header);

        if (flow.id === 'evening' && this._step === 0 && this._view.intention) {
            this.contentLayout.add_child(this._label(`Today's intention: ${this._view.intention}`,
                'stoic-flow-intention', {can_focus: true}));
        }

        this.contentLayout.add_child(this._label(step.prompt, 'stoic-flow-prompt'));
        this._guidance = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-guidance'});
        this.contentLayout.add_child(this._guidance);
        this._renderGuidance();
        for (const field of step.fields)
            this.contentLayout.add_child(this._field(field, step));

        if (this._saveMessage)
            this.contentLayout.add_child(this._label(this._saveMessage, 'stoic-flow-saved'));

        if (this._step > 0)
            this.addButton({label: 'Back', action: () => this._go(this._step - 1)});
        if (!last) {
            this.addButton({label: 'Skip', action: () => this._skip(step)});
            const next = this.addButton({label: 'Next', action: () => this._go(this._step + 1)});
            this._focusOn(this._first ?? next);
        } else if (this._practice) {
            const finish = this.addButton({label: 'Finish', action: () => this._finish()});
            this._focusOn(this._first ?? finish);
        } else {
            const save = this.addButton({label: this._saved ? 'Saved' : 'Save', action: () => this._save()});
            save.reactive = save.can_focus = !this._saved;
            const done = this.addButton({label: 'Done', action: () => this.close()});
            this._focusOn(this._saved ? done : save);
        }
    }

    _renderGuidance() {
        this._guidance.destroy_all_children();
        const id = this._answers.categoryId;
        const lines = GUIDANCE[this._flow.id]?.[this._flow.steps[this._step].id];
        if (!id || !lines)
            return;
        const category = guidanceFor(this._content, id);
        for (const key of lines)
            this._guidance.add_child(this._label(category[key], 'stoic-flow-guidance-line'));
    }

    _field(field, step) {
        const box = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-field'});
        const {virtues, categories} = this._content;
        switch (field.input) {
        case 'virtue':
            this._choice(box, field.id, virtues.map(v => [v.id, v.name]), step.prompt);
            break;
        case 'virtues':
            this._choice(box, field.id, virtues.map(v => [v.id, v.name]), step.prompt, {multi: true});
            break;
        case 'category':
            this._choice(box, field.id, categories.map(c => [c.id, c.label]), step.prompt, {
                onPick: () => {
                    // A suggested response belongs to its category; drop one left from another category.
                    const responses = guidanceFor(this._content, this._answers.categoryId).responses;
                    if (!responses.some(r => r.id === this._answers.responseId))
                        this._set('responseId', '');
                    this._renderGuidance();
                },
            });
            break;
        case 'text':
            this._text(box, field.id, step.fields.length > 1 ? FIELD_LABELS[field.id] : null, step.prompt);
            break;
        case 'response': {
            const id = this._answers.categoryId;
            if (id) {
                const responses = guidanceFor(this._content, id).responses;
                this._choice(box, 'responseId', responses.map(r => [r.id, r.text]), step.prompt,
                    {onPick: () => this._set('responseText', '')});
            }
            this._text(box, 'responseText', id ? FIELD_LABELS.responseText : null, step.prompt, {
                onType: text => text.trim() && this._set('responseId', ''),
            });
            break;
        }
        case 'passage':
            this._passage(box);
            break;
        }
        return box;
    }

    // Radio list, or a multi-check list when multi is set. Values are ids.
    _choice(box, key, options, name, {multi = false, onPick} = {}) {
        const group = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-options', accessible_name: name});
        const buttons = options.map(([id, label]) => {
            const button = this._button(null, 'stoic-flow-option', () => {
                if (multi) {
                    const chosen = new Set(this._answers[key] ?? []);
                    chosen.has(id) ? chosen.delete(id) : chosen.add(id);
                    this._set(key, options.map(o => o[0]).filter(o => chosen.has(o)));
                } else {
                    this._set(key, id);
                }
                onPick?.();
                this._sync();
            }, {
                x_expand: true, accessible_name: label, child: this._label(label, null),
                accessible_role: multi ? Atk.Role.CHECK_BOX : Atk.Role.RADIO_BUTTON,
            });
            group.add_child(button);
            return [id, button];
        });
        this._syncers.push(() => {
            for (const [id, button] of buttons) {
                const value = this._answers[key];
                button.checked = multi ? (value ?? []).includes(id) : value === id;
            }
        });
        this._first ??= buttons[0]?.[1] ?? null;
        box.add_child(group);
        this._sync();
    }

    // Multi-line wrapping entry (R4).
    _text(box, key, label, prompt, {onType} = {}) {
        if (label)
            box.add_child(this._label(label, 'stoic-flow-field-label'));
        const entry = new St.Entry({
            style_class: 'stoic-flow-entry', can_focus: true, x_expand: true,
            text: this._answers[key] ?? '', accessible_name: label ?? prompt,
        });
        const text = entry.clutter_text;
        text.single_line_mode = false;
        text.activatable = false;
        text.line_wrap = true;
        text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        text.connect('text-changed', () => {
            if ((this._answers[key] ?? '') === text.text)
                return;
            onType?.(text.text);
            this._set(key, text.text);
            this._sync();
        });
        this._syncers.push(() => {
            const value = this._answers[key] ?? '';
            if (text.text !== value)
                text.text = value;
        });
        this._first ??= entry;
        box.add_child(entry);
    }

    // Read-only passage for the chosen virtue, or the daily virtue (lib-api.md).
    _passage(box) {
        const key = this._view.dateKey;
        const virtueId = this._answers.virtueId ?? dailyVirtue(this._content, key).id;
        const passage = passageFor(this._content, key, virtueId);
        if (!passage)
            return;
        const source = this._content.sources.find(s => s.id === passage.sourceId);
        const cite = `${source?.author ?? ''}, ${passage.work}, ${passage.locator}`;
        const card = new St.BoxLayout({
            orientation: VERTICAL, style_class: 'stoic-flow-passage', can_focus: true,
            accessible_name: `${passage.text} ${cite}`,
        });
        card.add_child(this._label(passage.text, 'stoic-flow-passage-text'));
        card.add_child(this._label(cite, 'stoic-flow-passage-cite'));
        box.add_child(card);
        this._first ??= card;
        if (this._answers.passageId !== passage.id)
            this._set('passageId', passage.id);
    }

    // --- state ------------------------------------------------------------

    _set(key, value) {
        if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0))
            delete this._answers[key];
        else
            this._answers[key] = value;
        // Practices save as the user goes: the store debounces this by 500 ms (FR-019, R5).
        if (this._practice)
            this._store.updateEntry(this._entryId, {answers: {[key]: this._answers[key] ?? ''}});
    }

    _sync() {
        for (const sync of this._syncers)
            sync();
    }

    _go(index) {
        this._step = Math.max(0, Math.min(index, this._flow.steps.length - 1));
        if (this._practice) {
            // A step change saves at once and is where the record is first created.
            this._store.updateEntry(this._entryId, {currentStep: this._flow.steps[this._step].id});
            this._store.flush();
        }
        this._render();
    }

    // Completed only on an explicit Finish; blank answers never block it (FR-017, FR-019).
    _finish() {
        this._store.finishEntry(this._entryId);
        this.close();
    }

    // Skip leaves this step unanswered (FR-017). The passage is shown, not answered, so it stays.
    _skip(step) {
        for (const field of step.fields) {
            if (field.input === 'passage')
                continue;
            this._set(field.id, '');
            if (field.input === 'response')
                this._set('responseText', '');
        }
        this._go(this._step + 1);
    }

    // Writes the one Saved Pause Entry. Offered once; a failed write keeps the answers here (data-model §5.2).
    _save() {
        if (this._saved)
            return;
        this._saved = this._store.addEntry({kind: this._flow.id, createdAt: this._openedAt, answers: this._answers});
        this._saveMessage = this._saved ? 'Saved.' : 'Could not save. Your answers are still here.';
        this._render();
    }

    // --- widgets ----------------------------------------------------------

    _label(text, style_class, params = {}) {
        const label = new St.Label({text, style_class, ...params});
        label.clutter_text.line_wrap = true;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    // A null label means the caller passes its own (wrapping) child.
    _button(label, style_class, action, params = {}) {
        const text = label === null ? {} : {label, accessible_name: label};
        const button = new St.Button({...text, style_class, can_focus: true, ...params});
        button.connect('clicked', () => action());
        return button;
    }

    _focusOn(actor) {
        this.setInitialKeyFocus(actor);
        if (this.state === ModalDialog.State.OPENED)
            actor.grab_key_focus();
    }
});
