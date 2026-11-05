# Research: Stoic Companion (Phases 1–2)

Each entry settles one open design question from the spec or the product document (`setup.md`, section 10).

## R1. Platform and module format

**Decision**: GJS ES modules for GNOME Shell 50 and 51 only, with `metadata.json` `shell-version: ["50", "51"]`. Use `St.BoxLayout` with `orientation` (not the deprecated `vertical`), the `Extension`/`ExtensionPreferences` base classes, and `MessageTray.Source` with `MessageTray.Notification` objects. Test on Wayland only: Shell 50 dropped the X11 session.
**Rationale**: FR-051 pins these two versions and FR-049 forbids deprecated APIs. ESM has been the only extension format since Shell 45.
**Alternatives considered**: Also supporting 48 and 49 would mean testing against two more API surfaces for no spec requirement.
**Open item**: `gresource` was not available on the planning machine, so the Shell 51 sources were not read. Confirm `addChrome` options, `ctrlAltTabManager.addGroup` and the `MessageTray` constructors in a nested Shell before the first UI task.

## R2. Where the sidebar lives

**Decision**: one `St.BoxLayout` added with `Main.layoutManager.addChrome(actor, {affectsStruts: false, trackFullscreen: true})`. It is placed on the primary monitor's work area and repositioned on `workareas-changed` and `monitors-changed`. The width is clamped to 200–480 logical px and to half the work-area width. User hiding calls `removeChrome`, and restoring calls `addChrome` again.
**Rationale**: chrome actors take input only inside their own bounds (FR-006). They sit above every workspace (FR-003). `trackFullscreen` gives FR-055 without any window tracking of our own. `affectsStruts: false` matches the spec's "Desktop coverage: Overlay" default. The Shell writes `visible` on fullscreen-tracked actors, so hiding has to go through `removeChrome` or the two would fight.
**Alternatives considered**: reserving a strut, which shrinks maximised windows and contradicts the overlay default. A layer-shell client window, which GNOME does not support.

## R3. Lock and login screens

**Decision**: declare no `session-modes`, so the extension runs in `user` mode only. The Shell disables it on lock and re-enables it on unlock. Meeting mode is kept as a field on the `Extension` instance, which the Shell creates once per process, so it survives lock but not logout.
**Rationale**: this meets FR-007 by construction. FR-014 asks that Meeting mode starts off in each new desktop session, and the instance field gives exactly that: a new Shell process starts it off, and a lock does not reset it.
**Alternatives considered**: `unlock-dialog` mode plus hiding, which needs a review justification and more code. Storing Meeting mode in GSettings and resetting it at enable, which would also reset it on every unlock.

## R4. Where the practice and Pause screens are shown

**Decision**: inside the Shell, as one `ModalDialog` subclass (`FlowDialog`) that runs a flow definition from `lib/flows.js`. It is used for morning practice, evening reflection, Quick Reset and Deep Reflection. Multi-line answers use `St.Entry` with `clutter_text` set to multi-line and wrapping.
**Rationale**: The Pause has to open instantly from the sidebar (SC-001, under 60 s). A modal dialog takes keyboard focus and Escape at once, which gives FR-047. Shell dialogs follow GNOME conventions and the text-scaling factor. One dialog driven by four data definitions avoids four screens.
**Alternatives considered**: a separate GTK4/libadwaita application, which would bring a second process, IPC to keep the sidebar in step, and a second writer of the journal. The product document reserves it for the Phase 3–4 library and journal. Expanding panels inside the 270 px sidebar are too narrow for writing.

## R5. Journal storage format

**Decision**: one JSON file per local date at `$XDG_DATA_HOME/stoic-companion/days/YYYY-MM-DD.json`. The directory is created with mode 0700. Files are written with `Gio.File.replace_contents_bytes_async(..., Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION)`, so each write goes to a temporary file that is renamed over the old one. Writes to one file are serialised, and the latest write wins. Answers are saved 500 ms after the last keystroke, and immediately on a step change or close. `disable()` flushes any pending write synchronously.
**Rationale**: the atomic rename means a crash or power loss leaves either the old file or the new one, never a torn one (FR-042, SC-006). Mode 0600/0700 gives FR-039. A per-day file keeps every write small, bounds the damage of any single fault, and fits "today's entries only" in this release. JSON needs nothing beyond GLib.
**Alternatives considered**: SQLite, which has no binding guaranteed inside the Shell (libgda is not a Shell dependency), and would be heavy for today-only reads. One append-only log, which has to be compacted and gets slower as it grows.

## R6. Failures while reading and writing

**Decision**: a write that fails (disk full, permission denied) leaves the old file untouched. The data stays in memory and is retried on the next change. The user gets a one-time notification: "Stoic Companion could not save. Your earlier records are safe." A day file that fails to parse is renamed to `YYYY-MM-DD.json.unreadable-<timestamp>`, and the user is told. It is never overwritten.
**Rationale**: these are the spec's "storage full or unwritable" and FR-042 cases. A notification is the one channel the Shell offers outside an open dialog, and it carries no journal content (FR-045).
**Alternatives considered**: deleting a corrupt file, which loses data. Blocking the dialog until a save succeeds, which strands the user.

## R7. Single writer for personal data

**Decision**: only the Shell process reads or writes personal data. The preferences window touches GSettings only. Delete all personal data is offered from the top-bar menu and confirmed in a Shell `ModalDialog`. It closes any open flow, drops in-memory state, deletes `$XDG_DATA_HOME/stoic-companion/` recursively, and refreshes the sidebar.
**Rationale**: with two writers, the Shell could rewrite a file the preferences window had just deleted (SC-009). One writer avoids any cross-process signalling.
**Alternatives considered**: putting the button in preferences, which needs a D-Bus call or a GSettings flag to tell the Shell. That is more code for the same result.

## R8. Daily pick and today's passage

**Decision**: `hash(s)` is 32-bit FNV-1a over a string.
- Daily virtue: `virtues[hash(date) % 4]`, with virtues sorted by id.
- `passageFor(date, virtueId)`: the virtue's passages sorted by id, index `hash(date + ":" + virtueId) % n`.
- The daily pick's passage is `passageFor(date, dailyVirtue)`.
- The Stoic reminder and the meeting reminder use the same scheme with the keys `":reminder"` and `":meeting"`.
- Today's Virtue is the virtue of the latest completed morning entry today that has one. Otherwise it is the daily virtue.

**Rationale**: everything derives from the date and the content, with no stored state, so the same date and virtue always give the same passage (FR-009). Choosing the daily virtue in morning practice leaves the passage unchanged, which keeps "virtue and thought aligned". Sorting by id makes the result independent of file order.
**Alternatives considered**: a stored random pick per day, which is more state and could differ between machines. Day-of-year modulo, which repeats on the same date every year.

## R9. Time, midnight and reminders

**Decision**: one `GnomeDesktop.WallClock` drives all time-based change. On each `notify::clock` (once a minute), the extension compares today's date key with the last one. If it changed, it loads the new day and re-renders. It also asks `ui/reminders.js` whether a reminder is due at this minute. Reminders (FR-037) are off by default. Each of morning and evening has an enabled flag and an `HH:MM` time. A reminder is skipped when that practice is already Completed today, or when it already fired today. A reminder missed while locked or logged out is not sent later. Notification text is fixed and generic, such as "Morning practice is here when you want it."
**Rationale**: `WallClock` follows suspend, resume and time-zone changes. A plain GLib timeout runs on the monotonic clock, which stops during suspend, so it would miss midnight after a laptop sleeps. One minute signal costs nothing measurable and is the only recurring source. `disable()` drops it (SC-011). Skipping a reminder for a finished practice keeps the product quiet. Sending late reminders after unlock would nag.
**Alternatives considered**: a timeout armed for the next midnight plus a re-check on resume, which needs logind and is two mechanisms instead of one.

## R10. Keyboard access, shortcuts and screen readers

**Decision**: the GSettings keys `toggle-sidebar`, `toggle-meeting-mode`, `open-pause` and `focus-sidebar` hold `as` accelerators and are registered with `Main.wm.addKeybinding` in `NORMAL | OVERVIEW` action modes. The sidebar is also added to `Main.ctrlAltTabManager`, so Ctrl+Alt+Tab reaches it as it reaches the top bar. Every interactive actor has `can_focus` and an `accessible_name`. Read-only sections are focusable, with an accessible name that holds their text, so Orca can read them in order. Preferences use `Adw.PreferencesPage` rows, plus a small key-capture dialog built on `Gtk.EventControllerKey`, because libadwaita has no shortcut editor.
**Rationale**: these cover FR-036, FR-047 and FR-048. Ctrl+Alt+Tab is the Shell's own route for reaching chrome by keyboard.
**Alternatives considered**: pushing a modal grab to focus the sidebar, which would block the desktop while it is focused.

## R11. Appearance

**Decision**: the `color-scheme` key takes `system`, `light` or `dark`. `system` follows `org.gnome.desktop.interface color-scheme`. `background-opacity` (0.5–1.0, default 0.94) applies only to the background colour as an inline `rgba` style, so text stays fully opaque. Text sizes are in `em`, so St applies the desktop text-scaling factor (FR-048). No transitions or animations are declared anywhere in `stylesheet.css` (FR-013).
**Rationale**: these are the smallest settings that satisfy FR-035, and they keep the text legible at any opacity.

## R12. Bundled content and editions

**Decision**: content is JSON in `extension/content/`. Every passage is a direct quotation from a translation that is in the public domain worldwide, because the extension is distributed worldwide. Each passage references a source record. Quotations are copied word for word from the Standard Ebooks edition of each translation, and that edition is what `edition` records:

| Source id | Author | Work(s) | Translator | Translation first published | Edition the text is taken from | Public-domain basis |
|---|---|---|---|---|---|---|
| `long-meditations-1862` | Marcus Aurelius | Meditations | George Long | 1862 | Standard Ebooks, 2014 | Published 1862; translator died 1879 |
| `long-discourses-1877` | Epictetus | Discourses | George Long | 1877 | Standard Ebooks, 2020 | Published 1877; translator died 1879 |
| `long-enchiridion-1877` | Epictetus | Enchiridion | George Long | 1877 | Standard Ebooks *Short Works*, 2022 | Published 1877; translator died 1879 |
| `stewart-seneca-1889` | Seneca | On Anger, On the Shortness of Life, On Peace of Mind, On Providence | Aubrey Stewart | 1889 (*Minor Dialogues*, George Bell and Sons) | Standard Ebooks *Dialogues*, 2016 | Published 1889; translator died 1918 |

Standard Ebooks texts are proofread from older transcriptions checked against page scans. Standard Ebooks dedicates its own contributions to the public domain under CC0, so the edition adds no licence to track. It modernizes some sound-alike spellings, never grammar or wording, so a quotation matches the Standard Ebooks text exactly and the original printing in wording. That is why `edition` names Standard Ebooks rather than the printed edition. Work titles and locators follow the Standard Ebooks text (for example *On Peace of Mind*, which other editions call *On Tranquillity of Mind*). Standard Ebooks' *Dialogues* collects Stewart translations published between 1887 and 1898; only the four dialogues listed above, all from the 1889 *Minor Dialogues*, are quoted.

The Stoic reminders, meeting reminders, guidance and prompts are original modern text written for the product, and they are marked as such. At least three passages per virtue keep the daily pick varied (FR-059 needs one).
**Rationale**: FR-058 and SC-015 ask for a recorded basis. George Long (1800–1879) and Aubrey Stewart (1844–1918) died long enough ago that their translations are public domain even under life-plus-100 terms, while Gummere's widely used Loeb *Letters* (1917–25) is still under copyright in life-plus-70 countries until 2040. Stewart's dates come from his Wikisource author page and the Project Gutenberg catalogue; the README notes them. Stewart's *On Anger* fits The Pause well.
**Alternatives considered**: the Gummere *Letters*, for the copyright reason above. Seventeenth-century translations (Lodge, L'Estrange), whose English is too archaic for a sidebar. Quoting the original printings letter for letter from scans, which means checking every quotation against a page image. Project Gutenberg #6920 as the *Meditations* text: it is Edwin Ginn's later school edition of Long, not the 1862 printing. Gutenberg #10661 for Epictetus: it is a selection, not the full *Discourses*.

**References**: [Standard Ebooks *Meditations*](https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long), [*Discourses*](https://standardebooks.org/ebooks/epictetus/discourses/george-long), [*Short Works*](https://standardebooks.org/ebooks/epictetus/short-works/george-long), [*Dialogues*](https://standardebooks.org/ebooks/seneca/dialogues/aubrey-stewart), [Standard Ebooks and the public domain](https://standardebooks.org/about/standard-ebooks-and-the-public-domain), [Wikisource: Aubrey Stewart](https://en.wikisource.org/wiki/Author:Aubrey_Stewart), [Gutenberg #64576 (Stewart, *Minor Dialogues*, 1889)](https://www.gutenberg.org/ebooks/64576).

## R13. Guidance tone

**Decision**: guidance for each of the eight Pause categories, and the reflection prompts, are written to three rules that a content test also checks:
- Name the emotion as natural.
- Point to judgement, control and choice.
- Never diagnose, prescribe or condemn.

The test fails if text contains any of a short deny-list: "diagnos", "disorder", "therapy", "treatment", "you should not feel", "failure", "weak". A person still reviews the text, because a word list cannot judge tone.
**Rationale**: FR-023 and FR-056 are about wording. A cheap automated tripwire plus human review covers them without pretending a test can judge tone.

## R14. Testing

**Decision**: tests run under `gjs -m tests/run.js [filter]` (`make test`). The in-repo runner is about 40 lines. It imports every `tests/*.test.js`, runs their exported `test*` functions, and exits non-zero on any failure. Tests cover the four `lib/` modules, the compiled GSettings schema (defaults and ranges), and the bundled content (FR-058, FR-059, R13). `store.test.js` runs against a temporary directory and also checks file modes and the behaviour after a corrupt file and a failed write. UI behaviour is checked by hand in a nested Shell (`make devkit`, which runs `dbus-run-session gnome-shell --devkit --wayland`) on Shell 50 and 51, following `quickstart.md`.
**Rationale**: testing in GJS uses the same runtime and Gio as production, so store tests exercise real atomic writes. No package needs to be installed. `jasmine-gjs` is not in the Arch repositories, and Node cannot load `gi://` modules.
**Alternatives considered**: `jasmine-gjs` from the AUR, which is an extra install for features this suite does not need. Node's test runner, which cannot test `store.js`.
// simplified: hand-rolled runner with plain `assert` helpers; adopt jasmine-gjs if the suite needs async matchers or spies.
