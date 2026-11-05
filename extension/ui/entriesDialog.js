// Today's saved entries, read-only (FR-054), and the delete-all confirmation (FR-043).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import {FLOW_IDS, getFlow} from '../lib/flows.js';
import {FIELD_LABELS} from './flowDialog.js';

const VERTICAL = Clutter.Orientation.VERTICAL;

function closeOnEscape(dialog) {
    const keys = new Clutter.KeyController();
    keys.connect('key-press', () => {
        if (keys.get_key()[1] !== Clutter.KEY_Escape)
            return Clutter.EVENT_PROPAGATE;
        dialog.close();
        return Clutter.EVENT_STOP;
    });
    dialog.add_action_full('stoic-escape', Clutter.EventPhase.CAPTURE, keys);
}

function label(text, style_class, params = {}) {
    const l = new St.Label({text, style_class, ...params});
    l.clutter_text.line_wrap = true;
    l.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    return l;
}

function localTime(iso) {
    try {
        return GLib.DateTime.new_from_iso8601(iso, null).to_local().format('%H:%M');
    } catch {
        return '';
    }
}

export const EntriesDialog = GObject.registerClass(
class StoicEntriesDialog extends ModalDialog.ModalDialog {
    _init({store, content}) {
        super._init({styleClass: 'stoic-flow-dialog', shouldFadeIn: false, shouldFadeOut: false});
        this._store = store;
        this._content = content;
        closeOnEscape(this);
        this._showList();
    }

    _reset(title) {
        this.contentLayout.destroy_all_children();
        this.clearButtons();
        this.contentLayout.add_child(label(title, 'stoic-flow-title'));
    }

    _focus(actor) {
        this.setInitialKeyFocus(actor);
        if (this.state === ModalDialog.State.OPENED)
            actor.grab_key_focus();
    }

    _showList() {
        this._reset('Today\'s entries');
        // Entries of a kind this release does not know are skipped, never lost.
        const entries = this._store.entries().filter(e => FLOW_IDS.includes(e.kind));
        const list = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-options'});
        let first = null;
        for (const entry of entries) {
            const state = entry.state === 'in-progress' ? ' · In progress' : '';
            const text = `${getFlow(entry.kind).title} · ${localTime(entry.createdAt)}${state}`;
            const button = new St.Button({label: text, style_class: 'stoic-flow-option', can_focus: true, accessible_name: text, x_expand: true});
            button.connect('clicked', () => this._showEntry(entry));
            list.add_child(button);
            first ??= button;
        }
        if (!first)
            list.add_child(label('No entries yet today.', 'stoic-flow-prompt'));
        this.contentLayout.add_child(list);
        const close = this.addButton({label: 'Close', action: () => this.close()});
        this._focus(first ?? close);
    }

    _showEntry(entry) {
        const flow = getFlow(entry.kind);
        this._reset(`${flow.title} · ${localTime(entry.createdAt)}`);
        const body = new St.BoxLayout({orientation: VERTICAL, style_class: 'stoic-flow-guidance'});
        let first = null;
        for (const step of flow.steps) {
            for (const field of step.fields) {
                for (const [prompt, answer] of this._answered(entry.answers, field, step)) {
                    const item = new St.BoxLayout({
                        orientation: VERTICAL, style_class: 'stoic-flow-field', can_focus: true,
                        accessible_name: `${prompt} ${answer}`,
                    });
                    item.add_child(label(prompt, 'stoic-flow-field-label'));
                    item.add_child(label(answer, 'stoic-flow-guidance-line'));
                    body.add_child(item);
                    first ??= item;
                }
            }
        }
        if (!first)
            body.add_child(label('Nothing was written in this entry.', 'stoic-flow-prompt'));
        this.contentLayout.add_child(body);
        const back = this.addButton({label: 'Back', action: () => this._showList()});
        this.addButton({label: 'Close', action: () => this.close()});
        this._focus(first ?? back);
    }

    // [prompt, answer] pairs for one field, with ids resolved to names.
    _answered(answers, field, step) {
        const {virtues, categories, passages, sources} = this._content;
        const value = answers?.[field.id];
        const prompt = step.fields.length > 1 ? FIELD_LABELS[field.id] ?? step.prompt : step.prompt;
        const name = (list, id, key = 'name') => list.find(x => x.id === id)?.[key] ?? id;
        switch (field.input) {
        case 'virtue':
            return value ? [[prompt, name(virtues, value)]] : [];
        case 'virtues':
            return Array.isArray(value) && value.length ? [[prompt, value.map(id => name(virtues, id)).join(', ')]] : [];
        case 'category':
            return value ? [[prompt, name(categories, value, 'label')]] : [];
        case 'passage': {
            const p = passages.find(x => x.id === value);
            return p ? [[prompt, `${p.text} (${name(sources, p.sourceId, 'author')}, ${p.work}, ${p.locator})`]] : [];
        }
        case 'response': {
            const pairs = [];
            const responses = categories.find(c => c.id === answers?.categoryId)?.responses ?? [];
            if (value)
                pairs.push([prompt, responses.find(r => r.id === value)?.text ?? value]);
            if (answers?.responseText)
                pairs.push([FIELD_LABELS.responseText, answers.responseText]);
            return pairs;
        }
        default:
            return typeof value === 'string' && value ? [[prompt, value]] : [];
        }
    }
});

// Resolves `result` to true only when the user chooses Delete.
export const DeleteAllDialog = GObject.registerClass(
class StoicDeleteAllDialog extends ModalDialog.ModalDialog {
    _init() {
        super._init({shouldFadeIn: false, shouldFadeOut: false});
        this.result = new Promise(resolve => (this._resolve = resolve));
        this.connect('destroy', () => this._resolve(false));
        closeOnEscape(this);

        this.contentLayout.add_child(new Dialog.MessageDialogContent({
            title: 'Delete all personal data?',
            description: 'This removes every journal entry and practice record from this computer. ' +
                'It cannot be undone. Your settings are kept.',
        }));
        const cancel = this.addButton({label: 'Cancel', action: () => this.close()});
        cancel.accessible_name = 'Cancel';
        const remove = this.addButton({
            label: 'Delete',
            action: () => {
                this._resolve(true);
                this.close();
            },
        });
        remove.accessible_name = 'Delete';
        this.setInitialKeyFocus(cancel);
    }
});
