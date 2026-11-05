// T004: the compiled GSettings schema matches contracts/gsettings.md exactly.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {assert, assertEqual, assertDeepEqual} from './assert.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.stoic-companion';
const SCHEMA_PATH = '/org/gnome/shell/extensions/stoic-companion/';
const SCHEMAS_DIR = Gio.File.new_for_uri(import.meta.url)
    .get_parent().get_parent().get_child('extension').get_child('schemas');

// key -> [type, default, range]; range is ['type'] (none), ['enum', choices] or ['range', [min, max]].
const KEYS = {
    'sidebar-position': ['s', 'right', ['enum', ['left', 'right']]],
    'sidebar-width': ['i', 270, ['range', [200, 480]]],
    'background-opacity': ['d', 0.94, ['range', [0.5, 1.0]]],
    'color-scheme': ['s', 'system', ['enum', ['system', 'light', 'dark']]],
    'sidebar-hidden': ['b', false, ['type']],
    'toggle-sidebar': ['as', [], ['type']],
    'toggle-meeting-mode': ['as', [], ['type']],
    'open-pause': ['as', [], ['type']],
    'focus-sidebar': ['as', [], ['type']],
    'morning-reminder-enabled': ['b', false, ['type']],
    'morning-reminder-time': ['s', '08:00', ['type']],
    'evening-reminder-enabled': ['b', false, ['type']],
    'evening-reminder-time': ['s', '20:00', ['type']],
};

let _schema = null;

// Compile into a fresh temp dir with --strict so any warning fails the test.
function schema() {
    if (_schema)
        return _schema;
    const target = GLib.dir_make_tmp('stoic-schema-XXXXXX');
    const proc = Gio.Subprocess.new(
        ['glib-compile-schemas', '--strict', `--targetdir=${target}`, SCHEMAS_DIR.get_path()],
        Gio.SubprocessFlags.STDERR_PIPE);
    const [, , stderr] = proc.communicate_utf8(null, null);
    assert(proc.get_successful(), `glib-compile-schemas failed: ${stderr}`);
    const source = Gio.SettingsSchemaSource.new_from_directory(target, null, false);
    _schema = source.lookup(SCHEMA_ID, false);
    assert(_schema, `schema ${SCHEMA_ID} not found in compiled output`);
    return _schema;
}

function rangeOf(key) {
    const [kind, values] = key.get_range().recursiveUnpack();
    return kind === 'type' ? ['type'] : [kind, values];
}

export function testSchemaIdAndPath() {
    assertEqual(schema().get_id(), SCHEMA_ID, 'schema id');
    assertEqual(schema().get_path(), SCHEMA_PATH, 'schema path');
}

export function testExactKeySet() {
    assertDeepEqual(schema().list_keys().sort(), Object.keys(KEYS).sort(), 'key set');
}

export function testTypesDefaultsAndRanges() {
    for (const [name, [type, def, range]] of Object.entries(KEYS)) {
        const key = schema().get_key(name);
        assertEqual(key.get_value_type().dup_string(), type, `${name} type`);
        const actual = key.get_default_value().recursiveUnpack();
        if (type === 'd')
            assert(Math.abs(actual - def) < 1e-9, `${name} default: expected ${def}, got ${actual}`);
        else
            assertDeepEqual(actual, def, `${name} default`);
        assertDeepEqual(rangeOf(key), range, `${name} range`);
    }
}

export function testRangesRejectOutOfBounds() {
    const s = schema();
    assert(!s.get_key('sidebar-width').range_check(new GLib.Variant('i', 199)), 'width 199 accepted');
    assert(!s.get_key('sidebar-width').range_check(new GLib.Variant('i', 481)), 'width 481 accepted');
    assert(s.get_key('sidebar-width').range_check(new GLib.Variant('i', 480)), 'width 480 rejected');
    assert(!s.get_key('background-opacity').range_check(new GLib.Variant('d', 0.49)), 'opacity 0.49 accepted');
    assert(!s.get_key('background-opacity').range_check(new GLib.Variant('d', 1.01)), 'opacity 1.01 accepted');
    assert(!s.get_key('sidebar-position').range_check(new GLib.Variant('s', 'top')), 'position top accepted');
    assert(!s.get_key('color-scheme').range_check(new GLib.Variant('s', 'auto')), 'color-scheme auto accepted');
}

export function testReminderTimeDefaultsAreHHMM() {
    const re = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const name of ['morning-reminder-time', 'evening-reminder-time']) {
        const def = schema().get_key(name).get_default_value().unpack();
        assert(re.test(def), `${name} default ${def} is not HH:MM`);
    }
}

// FR-014: Meeting mode is never persisted. FR-013: no rotation or animation setting.
// FR-039/FR-046: no key can hold journal text.
export function testNoForbiddenKeys() {
    const keys = schema().list_keys();
    assert(!keys.includes('meeting-mode'), 'a meeting-mode key exists');
    for (const name of keys) {
        assert(!/rotat|animat|transition/.test(name), `rotation/animation key ${name}`);
        assert(!/journal|entr(y|ies)|answer|intention|reflection|note|text/.test(name),
            `key ${name} could hold journal text`);
        if (name.includes('meeting'))
            assertEqual(name, 'toggle-meeting-mode', `meeting key ${name} is not a shortcut`);
    }
    const strings = keys.filter(k => schema().get_key(k).get_value_type().dup_string() === 's');
    assertDeepEqual(strings.sort(),
        ['color-scheme', 'evening-reminder-time', 'morning-reminder-time', 'sidebar-position'],
        'free string keys');
}
