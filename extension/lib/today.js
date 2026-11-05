// Today's derived view: daily picks, practice state and reminder timing.
// Pure functions over content and today's entries (contracts/lib-api.md, data-model §4.4, §5.1, §5.4, R8, R9).
import GLib from 'gi://GLib';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const encoder = new TextEncoder();

// 32-bit FNV-1a over the UTF-8 bytes of s, unsigned.
export function hash(s) {
    let h = FNV_OFFSET;
    for (const byte of encoder.encode(String(s))) {
        h ^= byte;
        h = Math.imul(h, FNV_PRIME);
    }
    return h >>> 0;
}

// 'YYYY-MM-DD' of the local date.
export function dateKey(date) {
    return date.to_local().format('%Y-%m-%d');
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function pick(list, key) {
    if (!list || list.length === 0)
        return null;
    const sorted = list.slice().sort(byId);
    return sorted[hash(key) % sorted.length];
}

export function dailyVirtue(content, key) {
    return pick(content.virtues, key);
}

export function passageFor(content, key, virtueId) {
    const own = content.passages.filter(p => Array.isArray(p.virtueIds) && p.virtueIds.includes(virtueId));
    return pick(own, `${key}:${virtueId}`);
}

export function stoicReminder(content, key) {
    return pick(content.reminders.stoic, `${key}:reminder`);
}

export function meetingReminder(content, key) {
    return pick(content.reminders.meeting, `${key}:meeting`);
}

// 'completed' if any entry of that kind is completed, 'in-progress' if any is in progress.
export function practiceState(entries, kind) {
    let state = 'not-started';
    for (const e of entries) {
        if (e.kind !== kind)
            continue;
        if (e.state === 'completed')
            return 'completed';
        if (e.state === 'in-progress')
            state = 'in-progress';
    }
    return state;
}

export function defaultPractice(date) {
    return date.to_local().get_hour() < 12 ? 'morning' : 'evening';
}

// Microseconds since the epoch for an ISO 8601 timestamp, or null.
function instant(ts) {
    if (typeof ts !== 'string')
        return null;
    try {
        const dt = GLib.DateTime.new_from_iso8601(ts, null);
        return dt ? dt.to_unix() * 1000000 + dt.get_microsecond() : null;
    } catch {
        return null;
    }
}

// The entry with the latest timestamp, a later array position winning ties.
function latest(entries, stamp) {
    let best = null, bestAt = null;
    for (const e of entries) {
        const at = instant(stamp(e)) ?? -Infinity;
        if (best === null || at >= bestAt) {
            best = e;
            bestAt = at;
        }
    }
    return best;
}

const hasText = v => typeof v === 'string' && v.trim() !== '';

export function buildTodayView({content, key, entries, meetingMode}) {
    const mornings = entries.filter(e => e && e.kind === 'morning');

    const chosen = latest(
        mornings.filter(e => e.state === 'completed' && hasText(e.answers?.virtueId) &&
            content.virtues.some(v => v.id === e.answers.virtueId)),
        e => e.finishedAt);
    const virtue = chosen
        ? content.virtues.find(v => v.id === chosen.answers.virtueId)
        : dailyVirtue(content, key);

    const p = passageFor(content, key, virtue.id);
    const source = p ? content.sources.find(s => s.id === p.sourceId) : null;

    const r = meetingMode ? meetingReminder(content, key) : stoicReminder(content, key);

    const withIntention = latest(
        mornings.filter(e => hasText(e.answers?.intention)),
        e => e.updatedAt ?? e.finishedAt ?? e.createdAt);

    return {
        dateKey: key,
        virtue: {id: virtue.id, name: virtue.name, definition: virtue.definition, chosen: Boolean(chosen)},
        passage: p
            ? {id: p.id, text: p.text, author: source ? source.author : '', work: p.work, locator: p.locator}
            : null,
        reminder: r ? {id: r.id, text: r.text, meeting: Boolean(meetingMode)} : null,
        morning: practiceState(entries, 'morning'),
        evening: practiceState(entries, 'evening'),
        intention: withIntention ? withIntention.answers.intention : null,
    };
}

// True only when enabled, the time is a valid HH:MM equal to now, the practice
// is not completed, and the reminder has not already fired today (data-model §5.4).
export function reminderDue({enabled, time}, nowHHMM, currentState, lastFiredKey, todayKey) {
    return enabled === true &&
        typeof time === 'string' && TIME_RE.test(time) &&
        time === nowHHMM &&
        currentState !== 'completed' &&
        lastFiredKey !== todayKey;
}
