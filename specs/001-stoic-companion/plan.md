# Implementation Plan: Stoic Companion (Phases 1–2)

**Feature Directory**: `specs/001-stoic-companion` | **Date**: 2026-11-05 | **Spec**: [stoic-companion.spec.md](stoic-companion.spec.md)

> **Scale note.** This is a greenfield GNOME Shell extension of roughly 40 files across six areas: the sidebar chrome, four guided flows, journal storage, bundled content, preferences and tests. Watch the boundary between the pure modules under `lib/`, which are unit-tested outside the Shell, and the Shell-only code under `ui/`, which is checked by hand in a nested Shell. Logic that leaks into `ui/` goes untested.

## Summary

Stoic Companion is a GNOME Shell extension for Shell 50 and 51. It shows a fixed sidebar with five static sections, and it guides the user through The Pause (Quick Reset and Deep Reflection) and the morning and evening practices. All of it is written in GJS as ES modules. The sidebar is a Shell chrome actor that overlays the primary monitor's work area and hides itself over full-screen windows. The four guided flows are Shell modal dialogs, all driven by one step-flow component. Configuration lives in GSettings and is edited in a GTK4/libadwaita preferences window. Personal records are JSON files, one per day, under `$XDG_DATA_HOME/stoic-companion/`. They are written atomically with owner-only permissions, and only the Shell process writes them. Bundled philosophy content is JSON shipped inside the extension directory. Tests run under `gjs` with a small in-repo runner, so no test framework has to be installed.

## Project Structure

```text
extension/                                  # the installable extension (zipped by `make pack`)
├── metadata.json                           # uuid stoic-companion@leejsinclair.github.io, shell-version ["50","51"]
├── extension.js                            # enable/disable: wires sidebar, indicator, keybindings, clock, reminders
├── prefs.js                                # GTK4/libadwaita preferences window
├── stylesheet.css
├── schemas/org.gnome.shell.extensions.stoic-companion.gschema.xml
├── content/                                # bundled, read-only philosophy content (FR-046)
│   ├── sources.json                        # translations, translators, editions, public-domain basis
│   ├── virtues.json
│   ├── passages.json
│   ├── reminders.json                      # Stoic reminders and meeting reminders
│   └── guidance.json                       # The Pause categories, guidance and suggested responses
├── lib/                                    # pure logic: GLib/Gio only, no Shell imports, unit-tested
│   ├── content.js                          # load and validate bundled content
│   ├── today.js                            # date keys, daily pick, passage for virtue, practice states, TodayView
│   ├── flows.js                            # step definitions for morning, evening, Quick Reset, Deep Reflection
│   └── store.js                            # day files: load, debounced atomic save, delete all
└── ui/                                     # Shell-only, verified by hand in a nested Shell
    ├── sidebar.js                          # chrome actor, five sections, work-area and monitor tracking
    ├── indicator.js                        # top-bar menu: show/hide, Meeting mode, The Pause, today's entries, delete all
    ├── flowDialog.js                       # one ModalDialog that runs any flow from lib/flows.js
    ├── entriesDialog.js                    # today's saved entries, read-only
    └── reminders.js                        # daily reminder notifications
tests/
├── run.js                                  # minimal GJS test runner: `gjs -m tests/run.js [filter]`
├── today.test.js
├── content.test.js
├── flows.test.js
├── store.test.js
└── schema.test.js
Makefile                                    # schemas, test, pack, install, devkit
README.md                                   # supported Shell versions (FR-051), install, privacy statement
```

**Structure Decision**: one extension directory with a hard split between `lib/` (pure, tested with `gjs`) and `ui/` (Shell widgets). Tests live at the repository root so they are never packed into the extension zip.

## Call paths

```calls Finish morning practice and update the sidebar
+ Sidebar._onPracticeActivated() **new** @ extension/ui/sidebar.js
+   FlowDialog.open() **new** @ extension/ui/flowDialog.js
+     morningFlow() **new** @ extension/lib/flows.js
+     Store.updateEntry() **new** @ extension/lib/store.js
+     Store.finishEntry() **new** @ extension/lib/store.js
+   Extension._refresh() **new** @ extension/extension.js
+     buildTodayView() **new** @ extension/lib/today.js
+     Sidebar.render() **new** @ extension/ui/sidebar.js
```
note: The sidebar never reads files. It re-renders from one `TodayView` whenever the store's `changed` signal fires, the date changes or Meeting mode changes.

```calls The Pause: Quick Reset, saved or discarded
+ Sidebar._onPauseActivated() **new** @ extension/ui/sidebar.js
+   FlowDialog.open() **new** @ extension/ui/flowDialog.js
+     quickResetFlow() **new** @ extension/lib/flows.js
+     guidanceFor() **new** @ extension/lib/content.js
+     Store.addEntry() **new** @ extension/lib/store.js
```
note: A Pause session lives only in the dialog's memory. `Store.addEntry()` runs only on Save; closing or choosing Done drops the answers with the dialog (FR-025).

```calls Date change at midnight or after suspend
+ Extension._onClockTick() **new** @ extension/extension.js
+   dateKey() **new** @ extension/lib/today.js
+   Store.loadDay() **new** @ extension/lib/store.js
+   Extension._refresh() **new** @ extension/extension.js
+   Reminders.tick() **new** @ extension/ui/reminders.js
```
note: `_onClockTick()` runs on each `GnomeDesktop.WallClock` `notify::clock` and reloads only when the date key changed.

## Code pins

```js sketch extension/ui/sidebar.js hl=2
Main.layoutManager.addChrome(this._actor, {
    affectsStruts: false, trackFullscreen: true,
});
```
pin 2: `affectsStruts: false` makes the sidebar an overlay as the product default asks, and `trackFullscreen` lets the Shell hide it over a full-screen window on its monitor (FR-055). Because the Shell then owns `visible`, user hiding removes the actor from chrome instead of setting `visible`.

## States

```states Morning or evening practice for one day
NotStarted: No entry of this kind today. (start) shows sidebar
InProgress: An entry exists; answers are saved as typed. shows practice
Completed: The user chose Finish. (final) shows sidebar
Unfinished: Date changed before Finish; kept, never resumed. (final)
NotStarted -> InProgress: first answer or step change
InProgress -> InProgress: close and reopen resumes
InProgress -> Completed: Finish
InProgress -> Unfinished: local midnight
grid:
NotStarted | InProgress | Completed
.          | Unfinished | .
```
note: Starting the same practice again after Completed creates a second entry; the indicator stays Completed and the latest finished morning sets Today's Virtue.

```states A Pause session
Open: Steps shown; answers held in memory only. (start) shows practice
Concluded: Conclude step reached; Save offered.
Saved: One journal entry written. (final)
Discarded: Closed, or Done without saving; nothing kept. (final)
Open -> Concluded: next or skip to response
Open -> Discarded: close or Escape
Concluded -> Saved: Save
Concluded -> Discarded: Done
grid:
Open | Concluded | Saved
.    | Discarded | .
```

## Screens

```screen sidebar The sidebar
title: Today's Virtue (new)
text: Courage, with its one-line definition (new)
title: A Thought to Carry (new)
text: Passage, then author and work (new) (1)
title: Stoic Reminder (new)
text: Reminder, or a meeting reminder in Meeting mode (new) (2)
button: The Pause (new)
row:
  chip: Morning: Not started (new) (3)
  chip: Evening: Not started (new)
```
1: **Static all day.** The passage changes only at local midnight or when morning practice is finished.
2: **Only this section changes** in Meeting mode (FR-014).
3: **One activatable section.** It opens morning practice before noon and evening reflection from noon (FR-053).

```screen practice Guided flow dialog
title: Morning practice · Step 1 of 5 (new)
button: Switch to Evening reflection (new) (1)
text: Which virtue will you practise today? (new)
list: Wisdom | Courage | Justice | Temperance
row:
  button: Back (new)
  button: Skip (new) (2)
  button: Next (new)
```
1: **Practices only.** The Pause dialogs show Skip to response here instead (FR-057).
2: **Every step is optional** (FR-017). Escape closes the dialog: practice answers are already saved; a Pause session is discarded.

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template: no principles have been ratified, so there is no gate to pass or fail. The spec's own cross-cutting constraints stand in for one and are checked here, before research and again after design.

| Constraint (from the spec) | Before research | After design |
|---|---|---|
| Local only, no network, no telemetry (FR-039–FR-041, FR-044) | PASS | PASS: no network API is imported anywhere; content ships in the extension. |
| No scores, streaks or penalties (FR-018) | PASS | PASS: practice state has three plain values and nothing counts across days. |
| Unsaved Pause sessions leave no record (FR-025) | PASS | PASS: sessions live in dialog memory; the only write is Save. |
| Interruption never corrupts records (FR-042) | PASS | PASS: atomic replace per day file; unreadable files are set aside, never overwritten. |
| Clean disable (FR-050) | PASS | PASS: every resource has a matching release in `disable()`; see research R9. |
| Supported, non-deprecated GNOME APIs (FR-049, FR-051) | PASS | PASS, to confirm in a nested Shell 50 and 51 (research R1). |

Run the constitution command to ratify project principles, then re-run this check against them.

## Design artifacts

[research.md](research.md) holds the decisions, R1 to R14. [data-model.md](data-model.md) defines the entities and their state rules. [contracts/](contracts/README.md) pins the GSettings schema, the day-file format, the content JSON, the `lib/` API and the UI labels. [quickstart.md](quickstart.md) lists the build commands and the manual checks to run in a nested Shell.
