# Contract: Extension identity and GSettings schema

## metadata.json

```json
{
  "uuid": "stoic-companion@leejsinclair.github.io",
  "name": "Stoic Companion",
  "description": "A quiet Stoic sidebar with The Pause and daily practice. Local only.",
  "shell-version": ["50", "51"],
  "settings-schema": "org.gnome.shell.extensions.stoic-companion",
  "url": "https://github.com/leejsinclair/gnome-extension-stoic"
}
```

- No `session-modes` key. The extension runs in `user` mode only, so the Shell disables it on the lock and login screens (FR-007, research R3).
- `shell-version` is exactly `["50", "51"]` (FR-051).

## Schema `org.gnome.shell.extensions.stoic-companion`

File: `extension/schemas/org.gnome.shell.extensions.stoic-companion.gschema.xml`, path `/org/gnome/shell/extensions/stoic-companion/`.

| Key | Type | Default | Range / values | Requirement |
|---|---|---|---|---|
| `sidebar-position` | `s` | `'right'` | choices `left`, `right` | FR-002 |
| `sidebar-width` | `i` | `270` | 200–480. At runtime it is also capped at half the work-area width (R2). | FR-002 |
| `background-opacity` | `d` | `0.94` | 0.5–1.0. Applies to the background only (R11). | FR-035 |
| `color-scheme` | `s` | `'system'` | choices `system`, `light`, `dark` | FR-035 |
| `sidebar-hidden` | `b` | `false` | User hiding, restored across sessions | FR-004, FR-005 |
| `toggle-sidebar` | `as` | `[]` | Accelerators | FR-036 |
| `toggle-meeting-mode` | `as` | `[]` | Accelerators | FR-036 |
| `open-pause` | `as` | `[]` | Accelerators | FR-036 |
| `focus-sidebar` | `as` | `[]` | Accelerators | FR-036, FR-047 |
| `morning-reminder-enabled` | `b` | `false` | | FR-037 |
| `morning-reminder-time` | `s` | `'08:00'` | `HH:MM`, 24-hour local time | FR-037 |
| `evening-reminder-enabled` | `b` | `false` | | FR-037 |
| `evening-reminder-time` | `s` | `'20:00'` | `HH:MM`, 24-hour local time | FR-037 |

Rules:

- No key holds Meeting mode. It is a field on the `Extension` instance and is `false` at every new Shell process (FR-014, SC-005).
- No key holds content rotation or animation. Both are always off (FR-013).
- No key holds personal data. Journal content never enters GSettings (FR-039, FR-046).
- Shortcuts are empty by default so that they cannot collide with existing bindings. The user sets them in preferences.
- `*-reminder-time` values that do not match `^([01][0-9]|2[0-3]):[0-5][0-9]$` are treated as disabled, and `prefs.js` refuses to store them.

`tests/schema.test.js` compiles the schema and checks every default and range in this table.
