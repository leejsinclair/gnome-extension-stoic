# Contract: Bundled content

Read-only JSON in `extension/content/`, loaded by `lib/content.js`. It never holds personal data (FR-046). Each file is an object `{"version": 1, "<collection>": [...]}`. All `id` values are lowercase kebab-case and are unique within their collection.

## sources.json: `sources[]`

```json
{ "id": "long-meditations-1862",
  "author": "Marcus Aurelius",
  "works": ["Meditations"],
  "translation": "The Thoughts of the Emperor M. Aurelius Antoninus",
  "translator": "George Long",
  "edition": "Standard Ebooks, 2014 (spelling modernized): https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long",
  "year": 1862,
  "publicDomainBasis": "Published 1862; translator died 1879" }
```

Every field is required and non-empty. `edition` names the Standard Ebooks edition the quoted text is copied from, its release year, and its URL (R12). `year` is the year the translation was first published, as an integer. `works` is a list because one source can hold several works (Stewart's dialogues). The four sources and their works are fixed in research R12. `work` and `locator` on a passage follow the Standard Ebooks titles and numbering. A `publicDomainBasis` containing `to be confirmed` fails the release check (FR-058, SC-015).

## virtues.json: `virtues[]`

```json
{ "id": "courage", "name": "Courage",
  "definition": "Acting rightly in the face of fear, pain or difficulty.",
  "prompts": ["Where might fear decide for you today?"] }
```

Exactly four virtues, with these ids: `wisdom`, `courage`, `justice`, `temperance`.

## passages.json: `passages[]`

```json
{ "id": "meditations-4-3",
  "kind": "quotation",
  "text": "…",
  "sourceId": "long-meditations-1862",
  "work": "Meditations",
  "locator": "Book IV, 3",
  "explanation": "…",
  "virtueIds": ["wisdom", "temperance"] }
```

| Field | Rules |
|---|---|
| `kind` | `quotation`, `paraphrase` or `interpretation`. Phase 1–2 content uses `quotation` only (R12). |
| `sourceId` | Must match a `sources[].id` |
| `work` | One of that source's `works` |
| `locator` | Non-empty: book and section, or chapter |
| `virtueIds` | One or more virtue ids, no duplicates (FR-059) |
| `explanation` | Optional. Carried, not shown in Phases 1–2 |

Every virtue id must appear in at least one passage's `virtueIds` (FR-059). The plan aims for at least three.

## reminders.json: `stoic[]`, `meeting[]`

```json
{ "version": 1,
  "stoic":   [{ "id": "judgement-not-event", "text": "It is our judgement of things that disturbs us." }],
  "meeting": [{ "id": "listen-first", "text": "Listen to understand before responding" }] }
```

Both lists are non-empty. The texts are original modern writing.

## guidance.json: `categories[]`

```json
{ "id": "anger", "label": "Anger",
  "acknowledge": "Anger is a natural response. You can feel it and still choose what you do next.",
  "judgement": "What judgement am I adding to what happened?",
  "control": "…", "virtue": "…",
  "responses": [{ "id": "pause-before-replying", "text": "Pause before replying" },
                { "id": "ask-to-understand", "text": "Ask one question to understand" }] }
```

Exactly eight categories, in this order, with ids and labels as below. Labels are copied from the spec (US2 AS2).

| `id` | `label` |
|---|---|
| `anger` | `Anger` |
| `anxiety` | `Anxiety` |
| `frustration` | `Frustration` |
| `conflict` | `Conflict` |
| `overwhelm` | `Overwhelm` |
| `self-criticism` | `Self-criticism` |
| `disappointment` | `Disappointment` |
| `general-disturbance` | `General disturbance` |

`responses` is non-empty, and response ids are unique within a category.

## Validation (`tests/content.test.js`)

- Every rule above holds, and every reference resolves.
- Tone tripwire (R13): no guidance text, reminder or prompt contains any of the following, matched case-insensitively: `diagnos`, `disorder`, `therapy`, `treatment`, `you should not feel`, `failure`, `weak`. Passages are exempt, because they are historical quotations.
