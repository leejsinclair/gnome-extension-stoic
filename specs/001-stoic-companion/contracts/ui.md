# Contract: UI

The UI runs in the Shell. Manual checks and code use the names below. Section titles and state labels are copied from the spec.

## Sidebar (`ui/sidebar.js`)

Placement is the primary monitor's work area, on the side set by `sidebar-position`, with width `sidebar-width` (see [gsettings.md](gsettings.md)). The actor is added with `Main.layoutManager.addChrome(actor, {affectsStruts: false, trackFullscreen: true})`. Hiding removes it from chrome. The root actor has the style class `stoic-sidebar` and the accessible name `Stoic Companion sidebar`.

Sections, top to bottom. Each one has `can_focus: true`, and its accessible name is the title followed by the content text.

| # | Title (exact) | Style class | Content | Activatable |
|---|---|---|---|---|
| 1 | `Today's Virtue` | `stoic-section-virtue` | `TodayView.virtue.name` and `.definition` | no |
| 2 | `A Thought to Carry` | `stoic-section-passage` | `TodayView.passage.text`, then `author, work` | no |
| 3 | `Stoic Reminder` | `stoic-section-reminder` | `TodayView.reminder.text`. In Meeting mode this is the only section that changes (FR-014). | no |
| 4 | `The Pause` | `stoic-section-pause` | Button labelled `The Pause` | opens the Pause chooser |
| 5 | `Daily Practice Status` | `stoic-section-practice` | Two chips: `Morning: <state>` and `Evening: <state>` | opens `defaultPractice(now)` (FR-053) |

Practice state labels (exact): `Not started`, `In progress`, `Completed`. No number, percentage, streak or score appears anywhere (FR-012, FR-018). Unfinished entries from earlier days do not affect today's chips.

No CSS `transition` or `animation` is declared in `stylesheet.css` (FR-013).

## Pause chooser and flow dialog (`ui/flowDialog.js`)

One `ModalDialog` subclass, `FlowDialog`, with `FlowDialog.open(flowId)`.

- **Pause chooser**: two buttons, `Quick Reset` and `Deep Reflection` (FR-020).
- **Header**: `<flow title> · Step <n> of <total>`. The flow titles are `Morning practice`, `Evening reflection`, `Quick Reset` and `Deep Reflection`.
- **Practice flows** have a header button: `Switch to Evening reflection` or `Switch to Morning practice` (FR-053).
- **Pause flows** have a header button: `Skip to response` (FR-057).
- **Footer buttons**: `Back`, `Skip`, `Next`. On the last step these become `Finish` (practices), or `Save` and `Done` (Pause flows).
- **Escape or close**: practice answers are already saved. A Pause session is dropped and nothing is written (FR-025).

Every button and input has an accessible name equal to its visible label or prompt. Focus order follows the visual order (FR-048).

## Top-bar indicator (`ui/indicator.js`)

Menu items (exact labels):

- `Hide sidebar` / `Show sidebar` (switches `sidebar-hidden`)
- `Meeting mode` (switch item)
- `The Pause`
- `Today's entries` (opens `ui/entriesDialog.js`, which is read-only and lists entries from today's day file, FR-054)
- `Preferences`
- `Delete all personal data…` (opens a confirmation dialog whose buttons are `Cancel` and `Delete`, FR-043)

## Keybindings

They are registered with `Main.wm.addKeybinding(name, settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, handler)` and removed in `disable()`.

| Name | Action |
|---|---|
| `toggle-sidebar` | Hide or show the sidebar |
| `toggle-meeting-mode` | Turn Meeting mode on or off |
| `open-pause` | Open the Pause chooser |
| `focus-sidebar` | Move keyboard focus to the sidebar |

The sidebar is also added to `Main.ctrlAltTabManager` (R10).

## Notifications (`ui/reminders.js`)

These are fixed texts. None contains journal content (FR-045).

| When | Text |
|---|---|
| Morning reminder | `Morning practice is here when you want it.` |
| Evening reminder | `Evening reflection is here when you want it.` |
| Write failed (once per session) | `Stoic Companion could not save. Your earlier records are safe.` |
| Day file unreadable | `Stoic Companion could not read one day's records. The file was set aside and kept.` |

## Disable

`disable()` releases every item it created: the sidebar chrome, the indicator, the keybindings, the ctrlAltTab group, the WallClock signal, the notification source, any open dialog, and the settings and store signals. It also flushes the store (FR-050, SC-011).
