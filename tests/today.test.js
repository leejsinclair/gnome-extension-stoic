// T006: lib/today.js (contracts/lib-api.md, data-model §4.4, §5.1, §5.4, research R8, R9).
import GLib from 'gi://GLib';

import {assert, assertEqual, assertDeepEqual} from './assert.js';

// Imported per test, so a missing or broken module fails each test on its own
// instead of stopping the runner.
const today = () => import('../extension/lib/today.js');

const KEY = '2026-11-05';
const KEYS = ['2026-01-01', '2026-02-28', '2026-06-15', '2026-11-05', '2027-03-09'];

// --- fixtures ---------------------------------------------------------------

function fixture() {
    return {
        sources: [
            {id: 'src-a', author: 'Marcus Aurelius', works: ['Meditations'], translation: 'T', translator: 'X', edition: 'E', year: 1862, publicDomainBasis: 'B'},
            {id: 'src-b', author: 'Epictetus', works: ['Discourses'], translation: 'T', translator: 'X', edition: 'E', year: 1877, publicDomainBasis: 'B'},
        ],
        virtues: [
            {id: 'wisdom', name: 'Wisdom', definition: 'Wisdom def.', prompts: ['p']},
            {id: 'courage', name: 'Courage', definition: 'Courage def.', prompts: ['p']},
            {id: 'temperance', name: 'Temperance', definition: 'Temperance def.', prompts: ['p']},
            {id: 'justice', name: 'Justice', definition: 'Justice def.', prompts: ['p']},
        ],
        passages: [
            {id: 'wis-c', kind: 'quotation', text: 'Wis C', sourceId: 'src-a', work: 'Meditations', locator: 'I.3', virtueIds: ['wisdom']},
            {id: 'cou-a', kind: 'quotation', text: 'Cou A', sourceId: 'src-b', work: 'Discourses', locator: 'II.1', virtueIds: ['courage']},
            {id: 'wis-a', kind: 'quotation', text: 'Wis A', sourceId: 'src-a', work: 'Meditations', locator: 'I.1', virtueIds: ['wisdom', 'justice']},
            {id: 'jus-b', kind: 'quotation', text: 'Jus B', sourceId: 'src-b', work: 'Discourses', locator: 'III.2', virtueIds: ['justice']},
            {id: 'tem-a', kind: 'quotation', text: 'Tem A', sourceId: 'src-a', work: 'Meditations', locator: 'IV.1', virtueIds: ['temperance']},
            {id: 'cou-b', kind: 'quotation', text: 'Cou B', sourceId: 'src-a', work: 'Meditations', locator: 'V.2', virtueIds: ['courage']},
            {id: 'wis-b', kind: 'quotation', text: 'Wis B', sourceId: 'src-b', work: 'Discourses', locator: 'I.2', virtueIds: ['wisdom']},
            {id: 'tem-b', kind: 'quotation', text: 'Tem B', sourceId: 'src-b', work: 'Discourses', locator: 'IV.2', virtueIds: ['temperance', 'courage']},
            {id: 'jus-a', kind: 'quotation', text: 'Jus A', sourceId: 'src-a', work: 'Meditations', locator: 'III.1', virtueIds: ['justice']},
        ],
        reminders: {
            stoic: [
                {id: 'st-c', text: 'Stoic C'},
                {id: 'st-a', text: 'Stoic A'},
                {id: 'st-e', text: 'Stoic E'},
                {id: 'st-b', text: 'Stoic B'},
                {id: 'st-d', text: 'Stoic D'},
            ],
            meeting: [
                {id: 'mt-b', text: 'Meeting B'},
                {id: 'mt-a', text: 'Listen to understand before responding.'},
                {id: 'mt-c', text: 'Meeting C'},
            ],
        },
        categories: [],
    };
}

const clone = v => JSON.parse(JSON.stringify(v));

// The same content with every list in a different order.
function shuffled() {
    const c = fixture();
    const rotate = (a, n) => a.slice(n).concat(a.slice(0, n));
    c.virtues = rotate(c.virtues.slice().reverse(), 1);
    c.passages = rotate(c.passages.slice().reverse(), 4);
    c.reminders.stoic = rotate(c.reminders.stoic.slice().reverse(), 2);
    c.reminders.meeting = rotate(c.reminders.meeting.slice().reverse(), 1);
    return c;
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function entry(kind, state, at, answers = {}) {
    const ts = `${KEY}T${at}:00+10:00`;
    const e = {id: `${kind}-${at}`, kind, state, createdAt: ts, updatedAt: ts, answers};
    if (state === 'completed')
        e.finishedAt = ts;
    return e;
}

function assertKeys(obj, keys, what) {
    assertDeepEqual(Object.keys(obj).sort(), keys.slice().sort(), `${what} keys`);
}

// --- hash and dateKey -------------------------------------------------------

export async function testHashFnv1aVectors() {
    const {hash} = await today();
    assertEqual(hash(''), 0x811c9dc5, 'hash("")');
    assertEqual(hash('a'), 0xe40c292c, 'hash("a")');
    assertEqual(hash('foobar'), 0xbf9cf968, 'hash("foobar")');
    assertEqual(hash('2026-11-05'), 0x6d1e1b30, 'hash("2026-11-05")');
}

export async function testHashIsUnsigned32Bit() {
    const {hash} = await today();
    for (const s of ['', 'a', 'foobar', ...KEYS, `${KEY}:reminder`, `${KEY}:meeting`]) {
        const h = hash(s);
        assert(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `hash(${JSON.stringify(s)}) = ${h} is not an unsigned 32-bit integer`);
    }
}

export async function testDateKeyFormat() {
    const {dateKey} = await today();
    assertEqual(dateKey(GLib.DateTime.new_local(2026, 3, 9, 0, 0, 0)), '2026-03-09', 'start of day');
    assertEqual(dateKey(GLib.DateTime.new_local(2026, 3, 9, 23, 59, 59)), '2026-03-09', 'end of day');
    assertEqual(dateKey(GLib.DateTime.new_local(2026, 12, 31, 12, 0, 0)), '2026-12-31');
}

export async function testDateKeyUsesLocalDate() {
    const {dateKey} = await today();
    // The same instants seen in UTC still give the local date.
    for (const [h, m] of [[0, 30], [23, 30]]) {
        const local = GLib.DateTime.new_local(2026, 1, 1, h, m, 0);
        assertEqual(dateKey(local.to_utc()), '2026-01-01', `UTC view of local 2026-01-01 ${h}:${m}`);
    }
}

// --- daily picks -------------------------------------------------------------

export async function testDailyVirtueBySortedIdAndHash() {
    const {hash, dailyVirtue} = await today();
    const sorted = fixture().virtues.sort(byId);
    for (const key of KEYS)
        assertEqual(dailyVirtue(fixture(), key).id, sorted[hash(key) % 4].id, `dailyVirtue(${key})`);
}

export async function testDailyVirtueIndependentOfFileOrder() {
    const {dailyVirtue} = await today();
    for (const key of KEYS) {
        assertEqual(dailyVirtue(shuffled(), key).id, dailyVirtue(fixture(), key).id, `dailyVirtue(${key})`);
        assertEqual(dailyVirtue(fixture(), key).id, dailyVirtue(fixture(), key).id, `dailyVirtue(${key}) repeat`);
    }
}

export async function testPassageForBySortedIdAndHash() {
    const {hash, passageFor} = await today();
    for (const key of KEYS) {
        for (const v of ['courage', 'justice', 'temperance', 'wisdom']) {
            const own = fixture().passages.filter(p => p.virtueIds.includes(v)).sort(byId);
            const want = own[hash(`${key}:${v}`) % own.length].id;
            assertEqual(passageFor(fixture(), key, v).id, want, `passageFor(${key}, ${v})`);
        }
    }
}

export async function testPassageForIndependentOfFileOrder() {
    const {passageFor} = await today();
    for (const key of KEYS) {
        for (const v of ['courage', 'justice', 'temperance', 'wisdom'])
            assertEqual(passageFor(shuffled(), key, v).id, passageFor(fixture(), key, v).id, `passageFor(${key}, ${v})`);
    }
}

export async function testRemindersBySortedIdAndHash() {
    const {hash, stoicReminder, meetingReminder} = await today();
    const stoic = fixture().reminders.stoic.sort(byId);
    const meeting = fixture().reminders.meeting.sort(byId);
    for (const key of KEYS) {
        assertEqual(stoicReminder(fixture(), key).id, stoic[hash(`${key}:reminder`) % stoic.length].id, `stoicReminder(${key})`);
        assertEqual(meetingReminder(fixture(), key).id, meeting[hash(`${key}:meeting`) % meeting.length].id, `meetingReminder(${key})`);
    }
}

export async function testRemindersIndependentOfFileOrder() {
    const {stoicReminder, meetingReminder} = await today();
    for (const key of KEYS) {
        assertEqual(stoicReminder(shuffled(), key).id, stoicReminder(fixture(), key).id, `stoicReminder(${key})`);
        assertEqual(meetingReminder(shuffled(), key).id, meetingReminder(fixture(), key).id, `meetingReminder(${key})`);
    }
}

// --- practice state ------------------------------------------------------------

export async function testPracticeStateTable() {
    const {practiceState} = await today();
    const inProg = entry('morning', 'in-progress', '07:00');
    const done = entry('morning', 'completed', '08:00');
    const eveDone = entry('evening', 'completed', '21:00');
    const pause = entry('quick-reset', 'completed', '10:00');
    const cases = [
        [[], 'not-started', 'no records'],
        [[eveDone, pause], 'not-started', 'only other kinds'],
        [[inProg], 'in-progress', 'one in progress'],
        [[inProg, entry('morning', 'in-progress', '09:00')], 'in-progress', 'two in progress'],
        [[done], 'completed', 'one completed'],
        [[inProg, done], 'completed', 'in progress then completed'],
        [[done, inProg], 'completed', 'completed then a second in progress'],
    ];
    for (const [entries, want, what] of cases)
        assertEqual(practiceState(entries, 'morning'), want, what);
    assertEqual(practiceState([inProg, done], 'evening'), 'not-started', 'evening ignores morning records');
    assertEqual(practiceState([eveDone], 'evening'), 'completed', 'evening completed');
}

export async function testDefaultPracticeNoonBoundary() {
    const {defaultPractice} = await today();
    assertEqual(defaultPractice(GLib.DateTime.new_local(2026, 11, 5, 0, 0, 0)), 'morning', '00:00');
    assertEqual(defaultPractice(GLib.DateTime.new_local(2026, 11, 5, 11, 59, 59)), 'morning', '11:59');
    assertEqual(defaultPractice(GLib.DateTime.new_local(2026, 11, 5, 12, 0, 0)), 'evening', '12:00');
    assertEqual(defaultPractice(GLib.DateTime.new_local(2026, 11, 5, 23, 59, 0)), 'evening', '23:59');
}

// --- buildTodayView -----------------------------------------------------------

const view = async (entries = [], meetingMode = false, content = fixture()) =>
    (await today()).buildTodayView({content, key: KEY, entries, meetingMode});

// A virtue that is not today's daily pick, so "chosen" is observable.
async function otherVirtues() {
    const {dailyVirtue} = await today();
    const daily = dailyVirtue(fixture(), KEY).id;
    return {daily, others: ['courage', 'justice', 'temperance', 'wisdom'].filter(v => v !== daily)};
}

export async function testViewShapeWithNoEntries() {
    const {dailyVirtue, passageFor, stoicReminder} = await today();
    const v = await view();
    assertKeys(v, ['dateKey', 'virtue', 'passage', 'reminder', 'morning', 'evening', 'intention'], 'view');
    assertEqual(v.dateKey, KEY, 'dateKey');

    const daily = dailyVirtue(fixture(), KEY);
    assertDeepEqual(v.virtue, {id: daily.id, name: daily.name, definition: daily.definition, chosen: false}, 'virtue');

    const p = passageFor(fixture(), KEY, daily.id);
    const src = fixture().sources.find(s => s.id === p.sourceId);
    assertKeys(v.passage, ['id', 'text', 'author', 'work', 'locator'], 'passage');
    assertEqual(v.passage.id, p.id, 'passage.id');
    assertEqual(v.passage.text, p.text, 'passage.text');
    assertEqual(v.passage.author, src.author, 'passage.author joined from its source');
    assertEqual(v.passage.work, p.work, 'passage.work');
    assertEqual(v.passage.locator, p.locator, 'passage.locator');

    const r = stoicReminder(fixture(), KEY);
    assertDeepEqual({...v.reminder}, {id: r.id, text: r.text, meeting: false}, 'reminder');
    assertKeys(v.reminder, ['id', 'text', 'meeting'], 'reminder');

    assertEqual(v.morning, 'not-started', 'morning');
    assertEqual(v.evening, 'not-started', 'evening');
    assertEqual(v.intention, null, 'intention');
}

export async function testViewVirtueFromLatestCompletedMorningByFinishedAt() {
    const {passageFor} = await today();
    const {others} = await otherVirtues();
    const [early, late] = others;
    const a = entry('morning', 'completed', '06:00', {virtueId: late});
    a.finishedAt = `${KEY}T09:00:00+10:00`;
    const b = entry('morning', 'completed', '07:00', {virtueId: early});
    b.finishedAt = `${KEY}T07:30:00+10:00`;
    // File order puts the earlier finish last.
    const v = await view([a, b]);
    assertEqual(v.virtue.id, late, 'virtue of the latest finishedAt');
    assertEqual(v.virtue.chosen, true, 'chosen');
    assertEqual(v.passage.id, passageFor(fixture(), KEY, late).id, 'passage follows the chosen virtue');
    assertEqual(v.morning, 'completed', 'morning');
}

export async function testViewSkipsLatestCompletedMorningWithoutVirtue() {
    const {others} = await otherVirtues();
    const withVirtue = entry('morning', 'completed', '07:00', {virtueId: others[0]});
    const without = entry('morning', 'completed', '09:00', {intention: 'Be patient'});
    const v = await view([withVirtue, without]);
    assertEqual(v.virtue.id, others[0], 'latest completed morning that has a virtueId');
    assertEqual(v.virtue.chosen, true, 'chosen');
}

export async function testViewInProgressMorningLeavesVirtueAndPassage() {
    const {others} = await otherVirtues();
    const base = await view();
    const v = await view([entry('morning', 'in-progress', '07:00', {virtueId: others[0], challenges: 'x'})]);
    assertDeepEqual(v.virtue, base.virtue, 'virtue');
    assertDeepEqual(v.passage, base.passage, 'passage');
    assertDeepEqual(v.reminder, base.reminder, 'reminder');
    assertEqual(v.morning, 'in-progress', 'morning indicator still changes');
}

export async function testViewChoosingDailyVirtueKeepsPassage() {
    const {daily} = await otherVirtues();
    const base = await view();
    const v = await view([entry('morning', 'completed', '07:00', {virtueId: daily})]);
    assertEqual(v.virtue.id, daily, 'virtue');
    assertEqual(v.virtue.chosen, true, 'chosen');
    assertDeepEqual(v.passage, base.passage, 'passage unchanged');
}

export async function testViewIntentionFromLatestMorningThatHasOne() {
    const a = entry('morning', 'completed', '06:00', {intention: 'First intention'});
    const b = entry('morning', 'completed', '08:00', {intention: 'Second intention'});
    const c = entry('morning', 'completed', '10:00', {challenges: 'no intention here'});
    const e = entry('evening', 'in-progress', '21:00', {wentWell: 'x'});
    const v = await view([a, b, c, e]);
    assertEqual(v.intention, 'Second intention', 'intention');
    assertEqual((await view([c, e])).intention, null, 'no morning with an intention');
}

export async function testViewMeetingModeChangesOnlyReminder() {
    const {meetingReminder} = await today();
    const entries = [entry('morning', 'completed', '07:00', {virtueId: 'courage', intention: 'Act'}), entry('evening', 'in-progress', '20:00')];
    const off = await view(clone(entries), false);
    const on = await view(clone(entries), true);
    const r = meetingReminder(fixture(), KEY);
    assertDeepEqual({...on.reminder}, {id: r.id, text: r.text, meeting: true}, 'meeting reminder');
    const {reminder: _a, ...restOff} = off;
    const {reminder: _b, ...restOn} = on;
    assertDeepEqual(restOn, restOff, 'everything but the reminder');
    assertEqual(off.reminder.meeting, false, 'stoic reminder when off');
}

export async function testViewEqualInputsGiveDeepEqualView() {
    const entries = [
        entry('morning', 'completed', '07:00', {virtueId: 'justice', intention: 'Be fair'}),
        entry('evening', 'in-progress', '20:00', {wentWell: 'x'}),
        entry('quick-reset', 'completed', '11:00', {categoryId: 'anger'}),
    ];
    for (const meetingMode of [false, true]) {
        const a = await view(clone(entries), meetingMode, fixture());
        const b = await view(clone(entries), meetingMode, fixture());
        assertDeepEqual(a, b, `meetingMode ${meetingMode}`);
        const c = await view(clone(entries), meetingMode, shuffled());
        assertDeepEqual(c, a, `shuffled content, meetingMode ${meetingMode}`);
    }
}

export async function testViewIgnoresUnknownEntryKinds() {
    const known = [entry('morning', 'in-progress', '07:00', {challenges: 'x'})];
    const base = await view(clone(known));
    const unknown = {
        id: 'u1', kind: 'gratitude', state: 'completed',
        createdAt: `${KEY}T23:00:00+10:00`, updatedAt: `${KEY}T23:00:00+10:00`, finishedAt: `${KEY}T23:00:00+10:00`,
        answers: {virtueId: 'courage', intention: 'Not a morning'},
    };
    const v = await view([...clone(known), unknown]);
    assertDeepEqual(v, base, 'unknown kind changes nothing');
}

export async function testViewCarriesNoCountOrScore() {
    const v = await view([entry('morning', 'completed', '07:00', {virtueId: 'wisdom'}), entry('evening', 'completed', '21:00')]);
    const walk = (o, path) => {
        for (const [k, val] of Object.entries(o)) {
            assert(!/count|percent|score|streak|total|rating/i.test(k), `view carries ${path}${k}`);
            if (val && typeof val === 'object')
                walk(val, `${path}${k}.`);
        }
    };
    walk(v, '');
}

// --- reminderDue --------------------------------------------------------------

const due = async (...args) => (await today()).reminderDue(...args);
const ON = {enabled: true, time: '07:30'};

export async function testReminderDueWhenAllConditionsHold() {
    assertEqual(await due(ON, '07:30', 'not-started', null, KEY), true, 'not started, never fired');
    assertEqual(await due(ON, '07:30', 'in-progress', '2026-11-04', KEY), true, 'in progress, fired yesterday');
}

export async function testReminderDueFalseWhenDisabled() {
    assertEqual(await due({enabled: false, time: '07:30'}, '07:30', 'not-started', null, KEY), false);
}

export async function testReminderDueFalseForInvalidTime() {
    for (const time of ['7:30', '24:00', '07:60', '', 'ab:cd', '07:30:00', ' 07:30'])
        assertEqual(await due({enabled: true, time}, time, 'not-started', null, KEY), false, `time ${JSON.stringify(time)}`);
    for (const time of ['00:00', '23:59', '19:05'])
        assertEqual(await due({enabled: true, time}, time, 'not-started', null, KEY), true, `time ${time}`);
}

export async function testReminderDueFalseWhenTimeIsNotNow() {
    assertEqual(await due(ON, '07:29', 'not-started', null, KEY), false, 'a minute early');
    assertEqual(await due(ON, '07:31', 'not-started', null, KEY), false, 'a minute late');
}

export async function testReminderDueFalseWhenPracticeCompleted() {
    assertEqual(await due(ON, '07:30', 'completed', null, KEY), false);
}

export async function testReminderDueFalseWhenAlreadyFiredToday() {
    assertEqual(await due(ON, '07:30', 'not-started', KEY, KEY), false);
}
