# Contracts: Stoic Companion (Phases 1–2)

The extension has no network API and no CLI. Code and tests depend on five surfaces. Each one is pinned in its own file here:

| Contract | Consumers | File |
|---|---|---|
| Extension identity and GSettings schema | `prefs.js`, `extension.js`, `tests/schema.test.js` | [gsettings.md](gsettings.md) |
| Journal day files on disk | `lib/store.js`, `tests/store.test.js` | [journal-storage.md](journal-storage.md) |
| Bundled content JSON | `lib/content.js`, `lib/today.js`, `lib/flows.js`, `tests/content.test.js` | [bundled-content.md](bundled-content.md) |
| Pure module API under `lib/` | `extension.js`, `ui/*`, `tests/*.test.js` | [lib-api.md](lib-api.md) |
| UI contract (sections, controls, accessible names, keybindings, notifications) | `ui/*`, the manual checks in `quickstart.md` | [ui.md](ui.md) |

**Verbatim Constraints.** The spec pins no literal identifiers and has no Verbatim Constraints section. The identifiers below come from `plan.md` and `research.md`, or are set here. The exact UI labels are the section names, category names and state names in the spec. They are copied exactly as written: `Today's Virtue`, `A Thought to Carry`, `Stoic Reminder`, `The Pause`, `Daily Practice Status`, `Not started`, `In progress`, `Completed`.

**Versioning.** The journal day file and every content file carry `"version": 1`. Any change to a shape in this directory that breaks compatibility increments that number. The reader must accept every version it has ever written.
