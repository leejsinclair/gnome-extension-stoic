// T028 (US3): Meeting mode changes only the Stoic Reminder and is never persisted.
import Gio from 'gi://Gio';
import {assert, assertDeepEqual, assertEqual} from './assert.js';
import {shippedContent} from './helpers.js';
import {buildTodayView} from '../extension/lib/today.js';

const KEY = '2026-11-05';
const ENTRIES = [{id: 'a', kind: 'morning', state: 'in-progress', createdAt: '2026-11-05T07:00:00+10:00',
    updatedAt: '2026-11-05T07:01:00+10:00', answers: {intention: 'Listen first.'}}];

// US3-AS1, US3-AS2
export function testMeetingModeChangesOnlyTheReminder() {
    const content = shippedContent();
    const off = buildTodayView({content, key: KEY, entries: ENTRIES, meetingMode: false});
    const on = buildTodayView({content, key: KEY, entries: ENTRIES, meetingMode: true});
    assertDeepEqual({...on, reminder: null}, {...off, reminder: null}, 'everything but the reminder is unchanged');
    assert(content.reminders.meeting.some(r => r.id === on.reminder.id && r.text === on.reminder.text),
        'the reminder comes from the meeting list');
    assertEqual(on.reminder.meeting, true);
    assertDeepEqual(buildTodayView({content, key: KEY, entries: ENTRIES, meetingMode: false}), off,
        'turning it off restores the normal view');
}

// US3-AS5, FR-014: only the shortcut mentions meeting, so no setting can hold the mode.
export function testNoSettingHoldsMeetingMode() {
    const schema = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent()
        .get_child('extension').get_child('schemas').get_child('org.gnome.shell.extensions.stoic-companion.gschema.xml');
    const xml = new TextDecoder().decode(schema.load_contents(null)[1]);
    const keys = [...xml.matchAll(/<key\s+name="([^"]+)"\s+type="([^"]+)"/g)].map(m => [m[1], m[2]]);
    assert(keys.length === 13, `schema has 13 keys, found ${keys.length}`);
    assertDeepEqual(keys.filter(([name]) => /meeting/i.test(name)), [['toggle-meeting-mode', 'as']]);
}
