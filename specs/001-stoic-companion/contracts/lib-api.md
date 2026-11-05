# Contract: `lib/` module API

Pure ES modules with GLib/Gio imports only and no Shell imports. Tests import these modules directly under `gjs -m`.

## lib/content.js

```js
export function loadContent(dir: Gio.File): Content          // throws ContentError on read or parse failure
export function validateContent(content: Content): string[]  // [] when valid; else one message per broken rule
export function guidanceFor(content: Content, categoryId: string): Category   // one entry of guidance.json
// Content = { sources, virtues, passages, reminders: {stoic, meeting}, categories }
```

## lib/today.js

```js
export function hash(s: string): number                       // 32-bit FNV-1a, unsigned
export function dateKey(date: GLib.DateTime): string          // 'YYYY-MM-DD' in local time
export function dailyVirtue(content, key): Virtue             // virtues sorted by id, [hash(key) % 4]
export function passageFor(content, key, virtueId): Passage   // virtue's passages sorted by id, [hash(`${key}:${virtueId}`) % n]
export function stoicReminder(content, key): Reminder         // key suffix ':reminder'
export function meetingReminder(content, key): Reminder       // key suffix ':meeting'
export function practiceState(entries, kind): 'not-started' | 'in-progress' | 'completed'
export function defaultPractice(date: GLib.DateTime): 'morning' | 'evening'   // before 12:00 local → 'morning'
export function buildTodayView({content, key, entries, meetingMode}): TodayView
export function reminderDue({enabled, time}, nowHHMM, practiceState, lastFiredKey, todayKey): boolean
```

`reminderDue` is true only when the reminder is enabled, `time` matches `^([01]\d|2[0-3]):[0-5]\d$` and equals `nowHHMM`, the practice is not `completed`, and `lastFiredKey` is not `todayKey` (data-model §5.4).

`practiceState` returns `completed` if any entry of that kind is completed, `in-progress` if any is in progress, and `not-started` otherwise.

```js
TodayView = {
  dateKey: string,
  virtue:   { id, name, definition, chosen: boolean },  // chosen = from today's latest completed morning entry
  passage:  { id, text, author, work, locator },
  reminder: { id, text, meeting: boolean },             // meeting reminder when meetingMode
  morning:  'not-started' | 'in-progress' | 'completed',
  evening:  'not-started' | 'in-progress' | 'completed',
  intention: string | null,                             // latest morning answers.intention today (FR-054)
}
```

The same `(content, key, entries, meetingMode)` always gives a deep-equal `TodayView` (FR-009, FR-013).

## lib/flows.js

```js
export const FLOW_IDS = ['morning', 'evening', 'quick-reset', 'deep-reflection']
export function getFlow(id): Flow
// Flow  = { id, title, persist: 'as-you-go' | 'on-save', steps: Step[], switchTo?: 'morning' | 'evening' }
// Step  = { id, prompt, fields: Field[] }          // every step is optional
// Field = { id, input: 'virtue' | 'virtues' | 'category' | 'text' | 'response' | 'passage' }
```

Step ids are what `currentStep` stores. Field ids are the `answers` keys in [journal-storage.md](journal-storage.md). Both are fixed:

| Flow | `persist` | Steps, in order, with their field ids |
|---|---|---|
| `morning` | `as-you-go` | `virtue` (`virtueId`), `challenges` (`challenges`), `control` (`inControl`, `notInControl`), `passage` (`passageId`, read-only), `intention` (`intention`) |
| `evening` | `as-you-go` | `went-well` (`wentWell`), `disturbance` (`disturbance`), `virtue` (`virtueActed`), `improve` (`improvement`) |
| `quick-reset` | `on-save` | `identify` (`categoryId`, `text`), `control` (none: category guidance), `response` (`responseId` or `responseText`), `conclude` (none) |
| `deep-reflection` | `on-save` | `recognise` (`categoryId`), `event` (`event`), `judgement` (`judgement`), `control` (`inControl`, `notInControl`), `virtues` (`virtueIds`, `virtueNotes`), `response` (`responseId` or `responseText`), `conclude` (none) |

- The evening dialog shows `TodayView.intention` above its first step when there is one (FR-054).
- Every step can be skipped (FR-017, FR-057). Pause flows offer a skip to `response` from any earlier step.
- The `passage` field shows `passageFor(key, chosen virtue or daily virtue)` and records its id when the step is reached.

## lib/store.js

```js
export class Store {               // emits 'changed' (no args) and 'error' (kind: 'write' | 'unreadable')
  constructor(rootDir: Gio.File)   // $XDG_DATA_HOME/stoic-companion in production; a temp dir in tests
  loadDay(key: string): Promise<Entry[]>
  entries(): Entry[]                               // entries for the loaded day
  resumeOrStart(kind: 'morning' | 'evening'): Entry // today's latest in-progress entry, or a new one held in memory until the first updateEntry
  updateEntry(id, patch: {currentStep?, answers?}): void     // merges answers; debounced 500 ms save
  finishEntry(id): void                            // state 'completed', finishedAt set, immediate save
  addEntry(entry: {kind: 'quick-reset' | 'deep-reflection', createdAt, answers}): void   // saved Pause session, immediate save
  flush(): void                                    // synchronous write of anything pending
  deleteAll(): Promise<void>                       // removes rootDir recursively, clears memory
}
```

`Entry` is the shape defined in [journal-storage.md](journal-storage.md). `Store` is the only module that touches personal data on disk.
