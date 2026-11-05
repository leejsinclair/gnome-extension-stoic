# Stoic Companion: Domain Context

## Terms

- **Daily pick**: The virtue and passage chosen from bundled content for a given date. The same date always gives the same pick, and it changes only when the date changes (local midnight). _Avoid_: daily rotation, random quote.
- **Today's Virtue**: The virtue the user chose in today's morning practice, or the daily pick's virtue when they have not.
- **Today's passage**: The passage shown as "A Thought to Carry". It is the daily pick's passage, or a passage associated with Today's Virtue once the user has chosen one. The same date and virtue always give the same passage.
- **Practice state**: Each of the morning and evening practice is Not started, In progress or Completed for the day. A practice is Completed only when the user explicitly finishes it. _Avoid_: progress, score, streak.

## Boundaries

- Sidebar content changes only through the daily pick or a user action. It never rotates within a day.
- A Pause session leaves no personal record unless the user saves it.

## Related documents

- [Feature spec 001: Stoic Companion, Phases 1–2](../../specs/001-stoic-companion/stoic-companion.spec.md)
