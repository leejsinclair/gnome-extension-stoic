// Shared setup for the story acceptance tests: a temp-dir store root and the shipped content.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {loadContent} from '../extension/lib/content.js';

const repo = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();

export const todayKey = () => GLib.DateTime.new_now_local().format('%Y-%m-%d');

// A not-yet-existing root inside a new temp dir.
export function freshRoot() {
    return Gio.File.new_for_path(GLib.dir_make_tmp('stoic-accept-XXXXXX')).get_child('stoic-companion');
}

export function shippedContent() {
    return loadContent(repo.get_child('extension').get_child('content'));
}

export function readDay(root, key) {
    const file = root.get_child('days').get_child(`${key}.json`);
    if (!file.query_exists(null))
        return null;
    try {
        return JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));
    } catch {
        return null;    // caught mid-write
    }
}

// Saves go out asynchronously; poll until the day file holds `count` entries.
export async function waitForEntries(root, key, count) {
    for (let waited = 0; waited < 3000; waited += 20) {
        const day = readDay(root, key);
        if (day && day.entries.length === count)
            return day;
        await new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, () => r() ?? GLib.SOURCE_REMOVE));
    }
    throw new Error(`day file never reached ${count} entries`);
}

// Every key name in a JSON value, at any depth.
export function keysOf(value, out = []) {
    if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
            if (!Array.isArray(value))
                out.push(k);
            keysOf(v, out);
        }
    }
    return out;
}
