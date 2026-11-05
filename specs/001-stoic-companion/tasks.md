# Tasks: Stoic Companion (Phases 1–2)

**Feature Directory**: `specs/001-stoic-companion` | **Spec**: [stoic-companion.spec.md](stoic-companion.spec.md) | **Plan**: [plan.md](plan.md)

> **Scale note.** This list covers about 40 new files across six areas: setup, bundled content, the pure `lib/` modules, the Shell UI, preferences and tests. The plan builds one data-driven dialog for all four flows and one derived `TodayView` for the sidebar. That puts most of the code in Foundational, which every story uses. US1 owns the Shell composition root and the sidebar. US4 owns the entries dialog. US2, US3 and US5 own acceptance tests over the Foundational modules. Watch the `lib/` and `ui/` boundary: logic that ends up in `ui/` is not covered by `make test`.

**Format**: `- [ ] **T###** [P?] [US#] Description · file`. `[P]` marks a task that can run in any order within its wave. Tests come from plan research R14. Foundational tests are written first and fail until their wave-2 modules land.

---

## Phase 1: Setup

**Wave 1 — independent (different files):**

- [x] **T001** [P] Makefile with targets `schemas` (`glib-compile-schemas extension/schemas`), `test` (`gjs -m tests/run.js $(FILTER)`), `pack` (`gnome-extensions pack extension/ --extra-source=lib --extra-source=ui --extra-source=content` into `dist/`), `install` and `devkit` (`dbus-run-session gnome-shell --devkit --wayland`), per quickstart.md. Add `dist/` and `extension/schemas/gschemas.compiled` to `.gitignore` · Makefile, .gitignore
- [x] **T002** [P] Minimal GJS test runner, about 40 lines. It imports every `tests/*.test.js`, or only the ones matching the filter argument. It runs each exported `test*` function, awaiting the async ones. It exports `assert`, `assertEqual` and `assertDeepEqual`, prints a pass/fail line for each test, and exits non-zero on any failure (R14) · tests/run.js
- [x] **T003** [P] `metadata.json` exactly as in contracts/gsettings.md: uuid `stoic-companion@leejsinclair.github.io`, `shell-version` `["50","51"]`, `settings-schema`, `url`, and no `session-modes` key, so the extension never runs on the lock or login screen (FR-007, FR-051, R3) · extension/metadata.json

---

## Phase 2: Foundational (blocks every story)

Covers the pure modules, the bundled content, the schema, the stylesheet, and the Shell pieces that several stories share: the notification source, the top-bar menu and the one flow dialog. No story work starts until this phase is done.

### Tests

**Wave 1 — independent (different files), written to fail first:**

- [x] **T004** [P] Schema test. Compile `extension/schemas/` into a temp dir and open it with `Gio.SettingsSchemaSource`. Assert every key, type, default, range and choice in contracts/gsettings.md. Assert there is no Meeting mode key, no rotation or animation key, and no key that could hold journal text (FR-002, FR-005, FR-014, FR-035–FR-037) · tests/schema.test.js
- [x] **T005** [P] Content test. `loadContent()` on `extension/content/` passes `validateContent()` with `[]`. Checks every rule in data-model §1 and contracts/bundled-content.md:
  - exactly four virtues with the fixed ids, and at least three passages per virtue (FR-059, SC-015)
  - every `sourceId`, `work` and `virtueIds` reference resolves, and no `publicDomainBasis` contains `to be confirmed` or `TBC` (FR-058)
  - exactly eight categories in the contract's order with the exact labels, and non-empty, unique responses
  - the tone deny-list (R13) on reminders, guidance, virtue prompts and every `getFlow()` step prompt (FR-023, FR-056)
  - `validateContent()` reports a dangling `sourceId` and a virtue with no passage on small inline fixtures
  · tests/content.test.js
- [x] **T006** [P] Today test:
  - `hash()` against known FNV-1a vectors; `dateKey()` uses the local date
  - `dailyVirtue()`, `passageFor()`, `stoicReminder()` and `meetingReminder()` are deterministic and do not depend on file order (shuffled fixture)
  - the `practiceState()` table in data-model §5.1; `defaultPractice()` at 11:59 and at 12:00
  - `buildTodayView()`: virtue from the latest completed morning by `finishedAt`; an in-progress morning leaves virtue and passage unchanged; choosing the daily virtue keeps the daily passage; `intention` from the latest morning that has one; Meeting mode changes only `reminder`; equal inputs give a deep-equal view; unknown entry kinds are ignored
  - `reminderDue()` (see T016) for each of its five conditions
  · tests/today.test.js
- [x] **T007** [P] Flows test. `FLOW_IDS` and `getFlow()` match the step and field table in contracts/lib-api.md exactly: step order, step ids, field ids and `input` kinds, `persist`, and `switchTo` for the two practices. Every field id is an answer key for its kind in contracts/journal-storage.md (FR-015, FR-016, FR-020, FR-024) · tests/flows.test.js
- [x] **T008** [P] Store test, run against a temp dir:
  - the root and `days/` are mode 0700 and day files are 0600 (FR-039)
  - `resumeOrStart()` writes nothing until the first `updateEntry()`
  - `updateEntry()` debounces 500 ms; `flush()` writes synchronously; blank and whitespace-only answers are omitted
  - `finishEntry()` sets `finishedAt` and drops `currentStep`; `addEntry()` writes at once with `state: completed`
  - a corrupt file, and a file whose date does not match its name, are renamed `.unreadable-<ts>` and never overwritten, and the store emits `error` with `unreadable`
  - a failed write to a read-only dir leaves the old file byte-identical, emits `error` with `write`, and is retried on the next change (FR-042, SC-006)
  - unknown kinds and fields survive a rewrite; a `version` above 1 is never rewritten; an edit to a past-day entry is refused
  - `deleteAll()` removes the root, including set-aside files (FR-043, SC-009)
  · tests/store.test.js

### Implementation

**⟶ Wait for the Tests wave to finish, then:**

**Wave 2 — independent (different files):**

- [x] **T009** [P] GSettings schema `org.gnome.shell.extensions.stoic-companion` at path `/org/gnome/shell/extensions/stoic-companion/`, with the 13 keys, defaults, `<range>` and `<choices>` from contracts/gsettings.md (FR-002, FR-004, FR-005, FR-035–FR-037) · extension/schemas/org.gnome.shell.extensions.stoic-companion.gschema.xml
- [x] **T010** [P] The four sources in the R12 table, with ids `long-meditations-1862`, `long-discourses-1877`, `long-enchiridion-1877` and `stewart-seneca-1889`. `edition` names the Standard Ebooks edition with its release year, "spelling modernized" and URL; `year` is the translation's first publication; `publicDomainBasis` is copied from R12 (FR-058) · extension/content/sources.json
- [x] **T011** [P] The four virtues `wisdom`, `courage`, `justice` and `temperance`, each with a one-line `definition` and at least one `prompts` entry, written to the tone rule · extension/content/virtues.json
- [x] **T012** [P] At least three direct quotations per virtue, copied word for word from the Standard Ebooks texts named in T010, with `work` and `locator` following Standard Ebooks titles and numbering (R12). Each has `kind: quotation`, `sourceId`, `work`, `locator`, `virtueIds` and an optional `explanation`. Use only the source ids pinned in T010 (FR-009, FR-058, FR-059) · extension/content/passages.json
- [x] **T013** [P] `stoic` and `meeting` reminder lists, with at least five original lines each. One meeting line is "Listen to understand before responding". Every line passes the tone rule (FR-010, FR-014) · extension/content/reminders.json
- [x] **T014** [P] Eight Pause categories in the contract's order and with its labels. Each has `acknowledge` (names the emotion as natural), `judgement`, `control`, `virtue` and two or three `responses`. Nothing diagnoses, prescribes or condemns (FR-021–FR-023, FR-056) · extension/content/guidance.json
- [x] **T015** [P] `loadContent(dir)`, which throws `ContentError` on a read or parse failure, plus `validateContent(content)` for every rule in T005 and `guidanceFor(content, categoryId)`. Imports GLib and Gio only (FR-022, FR-046) · extension/lib/content.js
- [x] **T016** [P] Everything in the `lib/today.js` contract: `hash`, `dateKey`, `dailyVirtue`, `passageFor`, `stoicReminder`, `meetingReminder`, `practiceState`, `defaultPractice` and `buildTodayView`. Also add `reminderDue({enabled, time}, nowHHMM, practiceState, lastFiredKey, todayKey)`. It is true only when the reminder is enabled, the time matches `^([01]\d|2[0-3]):[0-5]\d$` and equals now, the practice is not completed, and it has not fired today. The view never carries a count, percentage or score (FR-008, FR-009, FR-012, FR-013, FR-018, FR-037, FR-053, FR-054, R8, R9) · extension/lib/today.js
- [x] **T017** [P] `FLOW_IDS` and `getFlow(id)` for morning, evening, quick-reset and deep-reflection, exactly per the contract table. Step prompts are original text and pass the tone rule. Every step is optional (FR-015–FR-017, FR-020, FR-024, FR-057) · extension/lib/flows.js
- [x] **T018** [P] The `Store` class per contracts/lib-api.md and journal-storage.md:
  - signals `changed` and `error`
  - creates the root and `days/` with mode 0700
  - writes with `replace_contents_bytes_async(..., PRIVATE | REPLACE_DESTINATION)`, one write at a time per file, the latest winning
  - a 500 ms debounce, a synchronous `flush()`, and blank answers omitted
  - unreadable files set aside, never overwritten
  - data kept in memory and retried after a failed write
  - `deleteAll()` cancels pending writes, then deletes the root recursively
  - no score or streak field anywhere (FR-019, FR-031, FR-039, FR-042, FR-043, FR-046, R5, R6)
  · extension/lib/store.js
- [x] **T019** [P] Styles for `stoic-sidebar`, the five `stoic-section-*` classes, the chips and the flow dialog. Sizes are in `em` so the desktop text scaling applies. Light and dark variants are style classes. There is no `transition` or `animation` anywhere (FR-013, FR-035, FR-048, FR-049, R11) · extension/stylesheet.css

**⟶ Wait for Wave 2 to finish, then:**

**Wave 3 — independent (different files):**

> Before the first UI task, confirm in a nested Shell 51 the API names that research R1 could only take from memory: the `addChrome` options, `ctrlAltTabManager.addGroup`, and the `MessageTray.Source` and `MessageTray.Notification` constructors.

- [x] **T020** [P] `Reminders` builds one `MessageTray.Source` titled "Stoic Companion" and provides:
  - `tick(now, view, settings)`, which fires the morning or evening notice when `reminderDue()` says so and records `lastFired` in memory only
  - `notifyStoreError(kind)`, which shows the write-failure notice at most once per session and an unreadable-file notice
  - `destroy()`
  All texts come verbatim from the ui.md notification table and never carry journal content (FR-037, FR-045, R6, R9) · extension/ui/reminders.js
- [x] **T021** [P] `Indicator` is a `PanelMenu.Button`. Its menu items have the exact ui.md labels: `Hide sidebar`/`Show sidebar` (following `sidebar-hidden`), a `Meeting mode` switch item, `The Pause`, `Today's entries`, `Preferences` and `Delete all personal data…`. Each item calls a function passed to the constructor. `setMeetingMode(bool)` keeps the switch in step. Every item has an accessible name, and `destroy()` disconnects everything (FR-004, FR-014, FR-048) · extension/ui/indicator.js
- [x] **T022** [P] `FlowDialog`, a `ModalDialog` subclass, with `FlowDialog.open(flowId, {store, content, view})`. The flow id `'pause'` shows the chooser buttons `Quick Reset` and `Deep Reflection`. `Quick Reset` has the initial focus (US2-AS1). Every flow from `getFlow()` gets:
  - the header `<title> · Step n of N`
  - inputs for all six field kinds: a virtue radio list, a virtues multi-check, a category list, multi-line wrapping `St.Entry` text, a response list plus an own-response entry, and a read-only passage from `passageFor()`
  - the footer buttons `Back`, `Skip` and `Next`
  Category steps show `guidanceFor()` text. For `persist: 'on-save'` flows, answers live only in dialog memory. A `Skip to response` header button jumps to `response`. The last step shows `Save` and `Done`. Save calls `store.addEntry()` once and then disables itself. If the save fails, the dialog stays concluded and keeps the answers. Done, Escape and close drop the session. Accessible names equal the visible labels and prompts, and focus follows visual order (FR-011, FR-017, FR-020–FR-022, FR-024, FR-025, FR-047, FR-048, FR-057) · extension/ui/flowDialog.js

**⟶ Wait for Wave 3 to finish, then:**

- [x] **T023** Add the `persist: 'as-you-go'` practice mode to `FlowDialog`:
  - `store.resumeOrStart(kind)` resumes at `currentStep`
  - `updateEntry()` runs on each edit and step change, and `flush()` on close
  - the last step shows `Finish`, which calls `finishEntry()`
  - a header button reads `Switch to Evening reflection` or `Switch to Morning practice`
  - evening shows `view.intention` above its first step when there is one
  - the passage step records `passageId` when reached
  (FR-015, FR-016, FR-019, FR-053, FR-054) · extension/ui/flowDialog.js

**Checkpoint**: `make test` passes (T004–T008 green). The pure core, the content and the shared Shell pieces are ready.

---

## Phase 3: User Story 1 — A quiet Stoic presence on the desktop (P1) 🎯 MVP

**Goal**: the sidebar shows the five sections, stays put, keeps out of the way, and restores its configuration.
**Independent Test**: quickstart.md checks 1–6, 9 (sidebar reached by keyboard) and 10.

Files: extension/extension.js, extension/ui/sidebar.js, extension/prefs.js

### Implementation

**Wave 1 — independent (different files):**

- [x] **T024** [P] [US1] `Sidebar`:
  - a vertical `St.BoxLayout` named `Stoic Companion sidebar`, using `orientation`, not the deprecated `vertical`
  - the five sections in order, with the exact titles and style classes; each is focusable, with the title plus its content as the accessible name
  - `render(view)` sets text only and never animates
  - added with `addChrome(actor, {affectsStruts: false, trackFullscreen: true})` on the primary monitor's work area; `left` or `right`; width clamped to 200–480 and to half the work area; re-laid out on `workareas-changed` and `monitors-changed`
  - `setHidden()` goes through `removeChrome` and `addChrome`
  - the background opacity is an inline `rgba` on the background only; a color-scheme class
  - the Pause button and the practice section emit `pause-activated` and `practice-activated` from a click or the keyboard
  - registered with `Main.ctrlAltTabManager`; `focus()`; `destroy()` releases every signal
  (FR-001–FR-004, FR-006, FR-008–FR-013, FR-035, FR-047, FR-048, FR-055, R2, R10) · extension/ui/sidebar.js
- [x] **T025** [P] [US1] `ExtensionPreferences` with three `Adw.PreferencesPage`s:
  - Appearance: position, width from 200 to 480, opacity from 0.5 to 1.0, color scheme
  - Shortcuts: the four keys, each with a key-capture dialog built on `Gtk.EventControllerKey`, a Clear action, and `Gtk.accelerator_parse` validation
  - Reminders: two enable switches, plus `HH:MM` entries that refuse invalid times
  It touches GSettings only and never personal data (FR-002, FR-035–FR-037, R7, R10) · extension/prefs.js

**⟶ Wait for Wave 1 to finish, then:**

- [x] **T026** [US1] The extension's composition root:
  - `enable()` loads and validates the content. Invalid content logs the problems and shows nothing.
  - It opens the `Store` at `$XDG_DATA_HOME/stoic-companion` and runs `loadDay(today)`.
  - It builds `Sidebar`, `Indicator` and `Reminders`.
  - `_refresh()` rebuilds the `TodayView` and renders it. It runs on store `changed`, on a date change and on a Meeting mode toggle. Store `error` goes to `notifyStoreError`.
  - Meeting mode is an instance field. Initialise it once (`this._meetingMode ??= false`) so it survives lock but not a new Shell (R3).
  - `GnomeDesktop.WallClock` `notify::clock` calls `_onClockTick()`. On a new date key it flushes, loads the new day and refreshes. Every minute it calls `reminders.tick()`.
  - Register the four keybindings with `Main.wm.addKeybinding` in `NORMAL | OVERVIEW` modes.
  - The Pause and the practice entry points open `FlowDialog` (`'pause'` or `defaultPractice(now)`).
  - `Today's entries` and `Delete all…` load `./ui/entriesDialog.js` with `await import()` on first use, so US1 runs before US4 lands. Delete closes any open dialog, then calls `store.deleteAll()` and refreshes.
  - `Preferences` calls `openPreferences()`.
  - `disable()` releases everything ui.md lists and calls `store.flush()`.
  (FR-001, FR-003–FR-005, FR-011, FR-014, FR-036, FR-043, FR-047, FR-050, FR-053, R3, R9) · extension/extension.js

**Checkpoint**: in a nested Shell, the sidebar shows today's pick in five sections, survives workspace switches, hide and restore, and relog, is absent on the lock screen, hides over a full-screen window, and leaves nothing behind on disable.

---

## Phase 4: User Story 2 — The Pause: Quick Reset (P1)

**Goal**: a Quick Reset opens from the sidebar, gives category-specific guidance, and leaves no record unless saved.
**Independent Test**: `make test FILTER=pause`, then quickstart.md check 7.

Files: tests/pause.test.js

### Tests

- [x] **T027** [US2] Quick Reset acceptance over the Foundational modules:
  - each of the eight categories gives its own `guidanceFor()` text and at least one response (US2-AS2)
  - the steps run identify, control, response, conclude, and `response` is reachable from every earlier step (US2-AS3, US2-AS4, FR-057)
  - against a temp-dir `Store`, a session that is never saved leaves no `days/` file (US2-AS5, US2-AS6, SC-014)
  - one `addEntry()` gives exactly one `quick-reset` entry with `state: completed` (FR-025)
  · tests/pause.test.js

**Checkpoint**: The Pause → Quick Reset → Done writes nothing. Save writes exactly one entry.

---

## Phase 5: User Story 3 — Meeting mode (P1)

**Goal**: Meeting mode swaps only the Stoic Reminder and starts off in every session. The product never watches the desktop.
**Independent Test**: `make test FILTER=meeting` and `FILTER=privacy`, then toggle Meeting mode from the menu and its shortcut in a nested Shell.

Files: tests/meeting.test.js, tests/privacy.test.js

### Tests

**Wave 1 — independent (different files):**

- [x] **T028** [P] [US3] Meeting mode acceptance. With `meetingMode` true, the `TodayView` differs from the false view only in `reminder`, and the reminder text comes from the `meeting` list. Turning it off again gives a deep-equal view (US3-AS1, US3-AS2). The only schema key that mentions meeting is the `toggle-meeting-mode` shortcut (type `as`). No key holds Meeting mode state, so nothing persists it (US3-AS5, FR-014) · tests/meeting.test.js
- [x] **T029** [P] [US3] Privacy tripwire. Scan every `.js` file under `extension/` and fail on any of `gi://Soup`, `gi://Gst`, `Gio.Socket`, `Gio.Resolver`, `Gio.NetworkMonitor`, `Shell.WindowTracker`, `'window-created'`, `focus-window`, `GLib.spawn`, `Gio.Subprocess`, `http://` or `https://` (US3-AS3, US3-AS4, FR-040, FR-041, FR-044) · tests/privacy.test.js

**Checkpoint**: Meeting mode changes only the Stoic Reminder, is off after relog, and stays as it was after lock and unlock.

---

## Phase 6: User Story 4 — Morning and evening practice (P2)

**Goal**: the practices save as the user goes, resume, finish, and update the sidebar. Today's entries can be read back, and all data can be deleted.
**Independent Test**: `make test FILTER=practice`, then quickstart.md check 8, then Today's entries and Delete all in a nested Shell.

Files: extension/ui/entriesDialog.js, tests/practice.test.js

### Tests

**Wave 1 — independent (different files):**

- [x] **T030** [P] [US4] Practice acceptance with a temp-dir `Store` plus `buildTodayView`:
  - a morning answered halfway reads `in-progress`, and a new `Store` on the same dir resumes it at its `currentStep` (US4-AS4, US4-AS9)
  - finishing with `courage` makes the view's virtue `courage`, chosen, with `passageFor(key, 'courage')` (US4-AS1)
  - a finish with every answer blank still completes (US4-AS3)
  - a second morning gives two entries, and the latest sets the virtue
  - the evening view carries today's intention (US4-AS6)
  - neither the files nor the view hold a score, streak or count (US4-AS5, US4-AS8)
  - `deleteAll()` leaves zero files (US4-AS10, SC-009)
  · tests/practice.test.js

### Implementation

- [x] **T031** [P] [US4] `EntriesDialog` is a read-only `ModalDialog` listing `store.entries()` for today by kind and time, labelled with the flow titles. Opening one shows each answered prompt and its answer, with ids resolved to names. Entries of unknown kind are skipped. `DeleteAllDialog` is a confirmation with the buttons `Cancel` and `Delete` that resolves to a boolean. Both are keyboard-usable, with accessible names (FR-043, FR-047, FR-048, FR-054) · extension/ui/entriesDialog.js

**Checkpoint**: start morning practice, close it halfway, reopen and finish it with Courage. The sidebar updates, the evening shows the intention, Today's entries lists both, and Delete all clears them.

---

## Phase 7: User Story 5 — Deep Reflection (P2)

**Goal**: a seven-step reflection that is stored only when saved.
**Independent Test**: `make test FILTER=deep-reflection`, then one saved and one unsaved Deep Reflection in a nested Shell.

Files: tests/deep-reflection.test.js

### Tests

- [x] **T032** [US5] Deep Reflection acceptance:
  - the seven steps come in order: recognise, event, judgement, control, virtues, response, conclude
  - every step can be skipped, and `response` is reachable from each earlier step (US5-AS1)
  - against a temp-dir `Store`, an unsaved session leaves no file (US5-AS2, US5-AS4)
  - one `addEntry()` with free text and `virtueIds` gives exactly one `deep-reflection` entry, with `virtueIds` stored as an array (US5-AS3, US5-AS4, FR-025)
  · tests/deep-reflection.test.js

**Checkpoint**: a saved Deep Reflection appears in Today's entries. An unsaved one leaves nothing.

---

## Phase 8: Polish

**Wave 1 — independent (different files):**

- [x] **T033** [P] Add `reminderDue()` to the `lib/today.js` section, so the contract matches T016 · specs/001-stoic-companion/contracts/lib-api.md
- [x] **T034** [P] README with:
  - the supported versions (GNOME Shell 50.x and 51.x, Wayland)
  - install from `make pack` and `make install`
  - the privacy statement: local only, no network, mode 0600, delete all
  - the content sources and editions, with their public-domain basis, a credit and link to each Standard Ebooks edition, the note that spellings are modernized, and the source of the translators' dates (R12)
  (FR-051, FR-058) · README.md

**⟶ Wait for Wave 1 to finish, then:**

- [x] **T035** Run `make schemas test pack`. Every test passes, and `dist/stoic-companion@leejsinclair.github.io.shell-extension.zip` contains `lib/`, `ui/`, `content/` and the compiled schema, but no `tests/` (SC-003, SC-006, SC-009, SC-014, SC-015) · dist/stoic-companion@leejsinclair.github.io.shell-extension.zip
- [ ] **T036** Run the quickstart.md manual checks 1–10 on GNOME Shell 50 and on 51. Add three more: Meeting mode on and off (US3), a day of use under a network capture showing zero connections (SC-007, SC-008), and every flow finished with Orca and the keyboard alone (SC-010, SC-013). Record any failure as a new task. This needs a person at a nested Shell (SC-001–SC-005, SC-011, SC-012) · specs/001-stoic-companion/quickstart.md

---

## Dependencies & Execution Order

**Phases**: Setup → Foundational → US1, US2, US3, US4 and US5 → Polish. Once Foundational is done, the five story phases touch disjoint files and can run in parallel. Their nested-Shell checks need US1's `extension.js`. US4's dialog loads lazily, so US1 does not wait for it.

**Waves**
- **Setup**: one wave (T001–T003).
- **Foundational**:
  1. tests T004–T008
  2. T009–T019
  3. T020–T022, after wave 2 because they import `lib/`
  4. T023, the same file as T022
- **US1**: T024 and T025, then T026, which imports both.
- **US2**: T027.
- **US3**: T028 and T029.
- **US4**: T030 and T031.
- **US5**: T032.
- **Polish**: T033 and T034, then T035, then T036.

**File ownership**: every path above appears under exactly one phase. `ui/flowDialog.js`, `ui/indicator.js` and `ui/reminders.js` are Foundational because three or more stories reach them. `extension.js` is US1's because the sidebar it composes is US1's.
