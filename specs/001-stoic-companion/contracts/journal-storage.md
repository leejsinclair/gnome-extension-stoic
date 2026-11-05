# Contract: Journal day files

Only the Shell process reads or writes these files (research R7).

## Location and permissions

| Path | Mode | Notes |
|---|---|---|
| `$XDG_DATA_HOME/stoic-companion/` | `0700` | Root of all personal data. Delete all removes it recursively (FR-043). |
| `$XDG_DATA_HOME/stoic-companion/days/` | `0700` | |
| `$XDG_DATA_HOME/stoic-companion/days/YYYY-MM-DD.json` | `0600` | One file per local date. Written with `Gio.FileCreateFlags.PRIVATE \| Gio.FileCreateFlags.REPLACE_DESTINATION`, so each write is an atomic replace (FR-042). |
| `$XDG_DATA_HOME/stoic-companion/days/YYYY-MM-DD.json.unreadable-<timestamp>` | `0600` | A day file that failed to parse, set aside and never overwritten (R6). `<timestamp>` is Unix seconds. |

Nothing else is written under this root. Bundled content is never copied here (FR-046).

## Day file shape (version 1)

```json
{
  "version": 1,
  "date": "2026-11-05",
  "entries": [
    {
      "id": "c0a8012e-5b1f-4f0e-9a51-3d3f0c6c7b21",
      "kind": "morning",
      "state": "completed",
      "createdAt": "2026-11-05T07:12:03+00:00",
      "updatedAt": "2026-11-05T07:15:40+00:00",
      "finishedAt": "2026-11-05T07:15:40+00:00",
      "answers": {
        "virtueId": "courage",
        "challenges": "Difficult review at 10.",
        "inControl": "My preparation and my tone.",
        "passageId": "meditations-4-3",
        "intention": "Speak plainly and listen first."
      }
    }
  ]
}
```

| Field | Type | Rules |
|---|---|---|
| `version` | number | `1` |
| `date` | string | `YYYY-MM-DD`, local date. Must match the file name. |
| `entries` | array | In creation order. May be empty. |
| `entries[].id` | string | `GLib.uuid_string_random()`. Unique within the file. |
| `entries[].kind` | string | `morning`, `evening`, `quick-reset` or `deep-reflection` |
| `entries[].state` | string | `in-progress` or `completed`. Pause kinds are always `completed`. |
| `entries[].createdAt`, `updatedAt` | string | ISO 8601 with offset |
| `entries[].finishedAt` | string \| null | Set once, when the user chooses Finish or Save |
| `entries[].currentStep` | string | Practices only, while `in-progress`: the step id the user was last on, so reopening resumes there (US4-AS4). Removed on Finish. |
| `entries[].answers` | object | Map of field `id` to value, per kind (table below). Blank answers are left out. |

## Answer keys by kind

| Kind | Keys |
|---|---|
| `morning` | `virtueId`, `challenges`, `inControl`, `notInControl`, `passageId`, `intention` |
| `evening` | `wentWell`, `disturbance`, `virtueActed`, `improvement` |
| `quick-reset` | `categoryId`, `text`, `responseId` or `responseText` |
| `deep-reflection` | `categoryId`, `event`, `judgement`, `inControl`, `notInControl`, `virtueIds` (array), `virtueNotes`, `responseId` or `responseText` |

All values are strings except `virtueIds`. Ids resolve against the bundled content.

## Rules

- An entry is written only for a morning or evening practice (when its first answer or first step change happens), or for a Pause session the user saves. A Pause session that is closed or finished without saving is never written (FR-025, SC-014).
- Practice answers are saved 500 ms after the last keystroke, and at once on a step change or close. `disable()` flushes any pending write synchronously (R5).
- A `morning` or `evening` entry with `state: "in-progress"` in a day file whose `date` is earlier than today is **Unfinished**. It is shown as unfinished and is never resumed (spec edge case). This state is derived and is never stored.
- Starting a practice that is already `completed` today creates a new entry. Both entries are kept.
- If a write fails, the file on disk is left as it was. The data stays in memory and the write is retried on the next change (R6).
- The reader ignores fields it does not know, so a later minor addition does not break an older reader.
