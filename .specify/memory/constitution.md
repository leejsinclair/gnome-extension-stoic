# Stoic Companion Constitution

## Core Principles

### I. Local and Private by Design (NON-NEGOTIABLE)

- The extension MUST NOT open network connections, send telemetry or analytics, or depend on any
  account or cloud service. Bundled content ships inside the extension.
- It MUST NOT access microphones, cameras, meeting applications, window or application activity,
  or any other desktop monitoring source, and MUST NOT infer the user's emotional state.
- Personal data MUST be stored only under the user's data directory
  (`~/.local/share/stoic-companion/`), with directories mode 0700 and files mode 0600.
- Notifications and any other surface visible to others MUST NOT contain text the user wrote.
- The user MUST be able to permanently delete all personal data from within the extension.
- Any feature that would transmit or expose personal data (including optional AI assistance)
  requires a MAJOR amendment to this constitution before it is specified.

Rationale: the journal holds private reflections. Trust is the product; one leak ends it.

### II. Quiet, User-Initiated Presence

- Sidebar content MUST change only through the daily pick (at local midnight) or an explicit user
  action. Nothing rotates, animates or pulses during the day.
- The extension MUST NOT interrupt the user unprompted, except for daily reminders the user has
  configured, and MUST NOT block interaction with the desktop outside its own bounds.
- Modes that change behaviour (such as Meeting mode) MUST be turned on only by the user and MUST
  start each session off unless the user's own setting says otherwise.

Rationale: a companion that demands attention defeats a practice aimed at calm and judgement.

### III. Practice, Not Engagement

- The product MUST NOT use scores, streaks, penalties, badges, counters across days or any other
  engagement mechanic. Practice state is limited to Not started, In progress and Completed.
- A practice is Completed only when the user explicitly finishes it. All prompts are optional.
- Guidance MUST stay grounded in Stoic principles and MUST NOT present itself as psychological
  diagnosis, therapy or a conclusion about the user. Any future pattern observation is offered
  as a suggestion only.
- Features are judged by whether they help the user practise without the tool, not by usage.

Rationale: the goal is the user's independence, not their dependence on the application.

### IV. Faithful Content, Kept Apart from Code

- Philosophical content MUST live in bundled data files (`extension/content/`), separate from
  presentation and logic code, and separate from personal data.
- Direct quotations MUST be copied word for word from a named edition of a translation that is in
  the public domain worldwide, with author, work, section, translator and edition recorded in
  `sources.json` and the README's content table.
- Paraphrases and modern writing (reminders, guidance, prompts) MUST be distinguishable from
  direct quotations wherever they are shown.
- Content files MUST pass the content tests (`tests/content.test.js`) for shape and attribution.

Rationale: misattributed or altered quotations undermine the authority the practice rests on,
and licensing doubt makes the extension undistributable.

### V. Records Survive Interruption

- Every write of personal data MUST be atomic (write to a temporary file, then replace), so a
  crash, logout or disable never leaves a partial or corrupted record.
- A file that cannot be read or parsed MUST be set aside and kept, never overwritten or deleted
  silently.
- A Pause session MUST leave no personal record unless the user chooses Save. Practice answers
  are saved as the user goes.
- Changes to the on-disk format MUST keep existing day files readable or ship a tested migration.

Rationale: losing or mangling a reflection is worse than never having stored it.

### VI. Clean, Supported GNOME Integration

- `metadata.json` MUST list exactly the GNOME Shell versions the extension has been checked
  against, and the README MUST state the same versions.
- Code MUST use only supported, non-deprecated GNOME Shell, GJS, GTK4 and libadwaita APIs.
- Every resource acquired in `enable()` (actors, signal connections, timeouts, keybindings,
  settings bindings, file monitors) MUST have a matching release in `disable()`, leaving no
  trace after disable.
- Logic in `extension/lib/` MUST NOT import Shell UI modules (St, Clutter, Main and the like) so
  it can run and be tested under plain `gjs`. UI code lives in `extension/ui/`; preferences use
  GTK4 and libadwaita in `prefs.js`.
- The UI MUST be operable by keyboard alone and respect the user's text scaling.

Rationale: an extension that leaks resources or relies on deprecated APIs breaks the user's
desktop and fails extensions.gnome.org review.

### VII. Test-First with Evidence

- Behaviour in `extension/lib/` MUST be developed Red, Green, Refactor: a failing test is written
  and run first, then the code that makes it pass. `make test` MUST pass before any task is
  marked complete.
- Every functional requirement MUST have a stated verification method in the plan's Verification
  Plan: an automated test, or a named manual check in a nested Shell (`make devkit`) for
  behaviour that cannot run under plain `gjs`.
- Task completion MUST carry evidence from a real test run, as the integrated-tdd extension
  enforces. Claims of "done" without a run are not accepted.

Rationale: the code handles private, irreplaceable data; tests are the cheapest proof it does so
correctly.

## Technical Constraints

- **Platform**: GNOME Shell extension in GJS (ES modules) on Wayland. Supported versions are those
  in `extension/metadata.json` (currently 50 and 51).
- **Configuration**: GSettings schema `org.gnome.shell.extensions.stoic-companion`. Settings are
  configuration only and MUST NOT hold journal content.
- **Personal data**: one JSON file per day under `~/.local/share/stoic-companion/days/`, as defined
  in the journal storage contract. Moving to another store (such as SQLite) requires a spec, a
  migration and a MINOR amendment here if it changes Principle V's guarantees.
- **Dependencies**: no runtime dependencies beyond GNOME platform libraries. No npm packages or
  bundlers in the shipped extension. Build and test use only `glib-compile-schemas`,
  `gnome-extensions` and `gjs`, driven by the `Makefile`. Linting uses ESLint as a dev-only
  npm dependency (`package.json`, `eslint.config.js`); nothing from `node_modules` ships.
- **Performance**: the sidebar MUST NOT run periodic work beyond the midnight date change and
  configured reminders, and MUST NOT read or write disk on every frame or redraw.
- **Companion application**: a separate GTK4/libadwaita application is permitted only when a
  spec shows the journal or library cannot work well inside the Shell. It is bound by every
  principle above.

## Development Workflow

- Work is spec-driven with Spec Kit: `/speckit-specify` (grilled by grill-specify), then
  `/speckit-plan`, `/speckit-tasks` and `/speckit-implement`. Each feature lives in its own
  `specs/NNN-name/` directory.
- Settled domain terms live in `docs/domain_knowledge/CONTEXT.md`. Specs, code and UI text MUST use
  those terms and avoid the terms it lists under _Avoid_.
- Every plan MUST include a Constitution Check against these principles, both before research and
  after design. A violation MUST be justified in the plan's complexity tracking or the design
  changed.
- Every change MUST pass `make lint` and `make test`, locally and in CI. The ESLint config
  enforces the GNOME/GJS code style and Principle VI's import boundary for `extension/lib/`.
- Before a release: `make test` passes, `make pack` builds cleanly, and the manual checks in the
  feature's `quickstart.md` are run in a nested Shell for each supported version.
- Contracts in `specs/*/contracts/` are the source of truth for settings keys, file formats,
  content shape and UI labels. Changing behaviour covered by a contract means changing the
  contract in the same change.

## Governance

- This constitution overrides other practice documents where they conflict. Specs, plans and tasks
  MUST comply with it.
- **Amendments** are made with `/speckit-constitution`, recorded in this file with a Sync Impact
  Report for review, and committed on their own with a message naming the new version. The
  report is removed before commit.
- **Versioning** follows semantic versioning: MAJOR for removing or redefining a principle or
  weakening a NON-NEGOTIABLE rule; MINOR for a new principle or section or materially expanded
  guidance; PATCH for clarifications and wording.
- **Compliance review**: each plan's Constitution Check and each `/speckit-analyze` run checks
  against this document. Constitution conflicts found by analysis are CRITICAL and block
  implementation until the artifact or the constitution is changed.
- Runtime guidance for agents and contributors lives in `README.md` and
  `docs/domain_knowledge/CONTEXT.md`; it MUST NOT contradict this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
