# Feature Specification: Stoic Companion

**Feature Directory**: `specs/001-stoic-companion`
**Created**: 2026-11-05
**Status**: Draft

**Grilled on**: 2026-11-05

**Input**: Product specification "Stoic Companion, Revision 2.0" (GNOME desktop, persistent sidebar, integrated Stoic practice)

## Clarifications

### Session 2026-11-05

- Q: Should this spec cover the whole product or only the first release? → A: Phases 1–2 only (sidebar, Quick Reset, Meeting mode, daily practice, Deep Reflection, local journal storage). Phases 3–5 get their own specs later.
- Q: What does the sidebar show on a day with no morning practice? → A: A fixed daily pick of virtue and passage from the bundled content, replaced by the user's virtue choice in morning practice.
- Q: Which GNOME Shell versions are supported? → A: GNOME Shell 50.x and 51.x, tested on both.
- Q: How is the journal protected on disk? → A: Readable and writable only by the owning user; no extra encryption.
- Q: Which sidebar sections does Meeting mode change? → A: Only the Stoic Reminder, which shows a meeting reminder; the other four sections stay as they are.
- Q: Can a Quick Reset be saved to the journal? → A: Yes, an optional save is offered at the end of a Quick Reset, as with Deep Reflection.
- Q: When the user chooses a virtue in morning practice, does the passage change too? → A: Yes. The passage becomes one associated with the chosen virtue, so virtue and thought stay aligned.
- Q: How does the user open morning and evening practice? → A: Daily Practice Status is clickable and opens the practice suited to the time of day; the user can switch to the other one.
- Q: What does Daily Practice Status display? → A: Two indicators, Morning and Evening, each with a plain state. No percentage or score.
- Q: What happens to an unfinished practice? → A: Answers are saved as the user goes; the practice is marked complete only when explicitly finished.
- Q: Does Meeting mode persist? → A: Session-only. It resets to normal mode after logout or restart.
- Q: What happens to a Pause session that is not saved? → A: Completed without saving and abandoned sessions retain no personal record; only a saved session creates a journal entry.
- Q: Can the user see saved entries in this release? → A: Today's entries only. Evening reflection shows today's intention, and today's saved entries can be reopened. Full history waits for Phase 4.
- Q: Can the user go back to an earlier step in The Pause? → A: Yes. Steps are shown in order and Back is available, so an accidental Next is recoverable.
- Q: Does The Pause open straight into Quick Reset? → A: No. It opens a choice of Quick Reset or Deep Reflection with Quick Reset already selected, so one more click or Enter starts it.
- Q: What does the sidebar do over a full-screen application? → A: It hides while a full-screen window is in front on its monitor and returns afterwards.

## User Scenarios & Testing *(mandatory)*

This spec covers delivery Phases 1 and 2 of the product. P1 stories are Phase 1, the first usable release. P2 stories are Phase 2.

### User Story 1 - A quiet Stoic presence on the desktop (Priority: P1)

A user logs in and finds a narrow sidebar on the edge of their screen. It shows today's virtue, a thought to carry, a short Stoic reminder, a way into The Pause, and the state of today's morning and evening practice. It never moves, animates or interrupts, and the user can still use any application outside its bounds.

**Why this priority**: The sidebar is the primary interface and the base every other capability hangs from.

**Independent Test**: Enable the extension, switch workspaces, hide and restore the sidebar, log out and back in. The sidebar shows the five sections each time and does not block other windows.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the user enables the extension, **Then** a sidebar appears on the right, 270 px wide, the height of the work area, with five sections: Today's Virtue, A Thought to Carry, Stoic Reminder, The Pause, Daily Practice Status.
2. **Given** the sidebar is visible, **When** the user changes workspace, **Then** the sidebar stays visible with the same content.
3. **Given** the sidebar is visible, **When** the user clicks or types in an application outside its bounds, **Then** that application receives the input.
4. **Given** the user hides the sidebar temporarily, **When** they restore it, **Then** it returns with the same position, size and content.
5. **Given** the user changed position, width or opacity, **When** they log out and back in, **Then** the sidebar restores that configuration.
6. **Given** the screen is locked or at the login screen, **When** it is shown, **Then** the sidebar is not drawn over it.
7. **Given** the sidebar is showing, **When** time passes with no user action, **Then** content does not rotate, animate or draw attention.
8. **Given** the user has not done morning practice today, **When** the sidebar is shown, **Then** it shows the daily pick of virtue and passage, and the same date always gives the same pick.
9. **Given** a window goes full screen on the sidebar's monitor, **When** it is in front, **Then** the sidebar is hidden; **When** it leaves full screen or another window comes to front, **Then** the sidebar returns unchanged.

---

### User Story 2 - The Pause: Quick Reset (Priority: P1)

A user feels angry, anxious or overwhelmed. They open The Pause from the sidebar, name the disturbance, see what is and is not in their control, choose a deliberate response and finish in 30 to 60 seconds. The steps are a guide, not a gate: they can skip any of them.

**Why this priority**: It is the product's moment-of-need value and is part of the first release.

**Independent Test**: Open The Pause from the sidebar, complete a Quick Reset, and confirm guidance matches the chosen category and no diagnosis is offered.

**Acceptance Scenarios**:

1. **Given** the sidebar is visible, **When** the user activates The Pause, **Then** a choice of Quick Reset or Deep Reflection opens with Quick Reset already selected, so one more click or Enter starts it.
2. **Given** a Quick Reset is open, **When** the user picks a category (Anger, Anxiety, Frustration, Conflict, Overwhelm, Self-criticism, Disappointment, General disturbance), **Then** the guidance shown is specific to that category and grounded in Stoic principles.
3. **Given** a Quick Reset, **When** the user steps through identify, control, response and conclude, **Then** the steps are shown in that order, the user can go back to an earlier step, and the session ends on conclude, with an optional save to the journal.
4. **Given** a Quick Reset at any step, **When** the user skips ahead, **Then** they can go straight to choosing a response.
5. **Given** a session is in progress, **When** the user closes it before concluding, **Then** the session is abandoned and no personal record of it is kept.
6. **Given** a Quick Reset is concluded, **When** the user does not choose save, **Then** no personal record of it is kept.
7. **Given** any guidance text, **When** it is displayed, **Then** it does not claim to diagnose or treat a psychological condition, and does not treat feeling the emotion as a failure.

---

### User Story 3 - Meeting mode (Priority: P1)

Before a meeting, the user switches the sidebar to Meeting mode. The layout stays the same, and the Stoic Reminder becomes a meeting reminder such as "Listen to understand before responding". The user switches back when done.

**Why this priority**: It extends the sidebar into a common daily situation at low cost.

**Independent Test**: Toggle Meeting mode on and off and confirm only the Stoic Reminder changes.

**Acceptance Scenarios**:

1. **Given** the sidebar is in normal mode, **When** the user turns Meeting mode on, **Then** the Stoic Reminder section shows a meeting reminder and the other four sections are unchanged.
2. **Given** Meeting mode is on, **When** the user turns it off, **Then** normal content returns.
3. **Given** Meeting mode is available, **When** it is in any state, **Then** the product has not accessed the microphone, camera, meeting applications or desktop activity.
4. **Given** the user has not turned it on, **When** a meeting application opens, **Then** Meeting mode stays off.
5. **Given** Meeting mode is on, **When** the user logs out and back in or the shell restarts, **Then** the sidebar starts in normal mode.

---

### User Story 4 - Morning and evening practice (Priority: P2)

Each morning the user spends 2 to 5 minutes choosing a virtue, anticipating challenges, separating what they control, reading a passage and writing an intention. Each evening they spend a similar time on what went well, where they were disturbed, whether they acted on their virtue and what to improve. They start either one from Daily Practice Status. Every question is optional, answers are kept as they go, and there is no score, streak or penalty.

**Why this priority**: It builds the daily habit and creates the first personal records.

**Independent Test**: Start a morning practice from the sidebar, close it halfway, resume and finish it. Then complete an evening reflection. Both are saved locally and the two status indicators update.

**Acceptance Scenarios**:

1. **Given** the user starts morning practice, **When** they select a virtue and finish, **Then** that virtue appears as Today's Virtue and A Thought to Carry shows a passage associated with it.
2. **Given** it is before noon, **When** the user activates Daily Practice Status, **Then** morning practice opens; **Given** it is noon or later, **Then** evening reflection opens. Either way the user can switch to the other practice.
3. **Given** any practice question, **When** the user leaves it blank and moves on, **Then** the practice still completes.
4. **Given** the user has answered some morning questions, **When** they close the practice without finishing, **Then** their answers are kept, Morning shows In progress, and reopening resumes where they left off.
5. **Given** an evening reflection is completed, **When** the user returns to the sidebar, **Then** Evening shows Completed. No percentage or score appears.
6. **Given** a morning intention was written today, **When** the user opens evening reflection, **Then** today's intention is shown.
7. **Given** entries were saved today, **When** the user asks to see today's entries, **Then** they can reopen and read each of them.
8. **Given** the user misses days, **When** they open the product, **Then** no streak, score, warning or penalty is shown.
9. **Given** a practice is interrupted by a crash or logout, **When** the user returns, **Then** previously saved records are intact.
10. **Given** the user asks to delete all personal data, **When** they confirm, **Then** all practice records and saved reflections are permanently removed.

---

### User Story 5 - Deep Reflection (Priority: P2)

For a harder situation, the user takes 2 to 5 minutes to recognise the disturbance, describe the event, separate event from judgement, list what they can and cannot control, consider the four virtues, choose a response and optionally save the reflection.

**Why this priority**: It is the deliberate-examination half of the product and feeds the journal.

**Independent Test**: Complete a Deep Reflection and save it; complete another and do not save it.

**Acceptance Scenarios**:

1. **Given** The Pause is open, **When** the user chooses Deep Reflection, **Then** they are guided through the seven steps in order, and can skip any step.
2. **Given** a Deep Reflection, **When** the user adds free text, **Then** the text is kept only if they save.
3. **Given** the final step, **When** the user chooses save, **Then** the reflection is stored as a journal entry; **When** they do not, **Then** nothing is stored.
4. **Given** a session in progress, **When** it is abandoned or completed without saving, **Then** no personal record exists afterwards; **When** it is saved, **Then** exactly one journal entry exists.

### Edge Cases

- What happens when the user hides the sidebar and then logs out? It restores per the saved setting.
- What happens on multiple monitors? The sidebar sits on the primary monitor's work area. Choosing a monitor is not offered in this release.
- What happens when the work area changes (resolution change, panel moved)? The sidebar resizes to the new work area.
- What happens when the configured width is too large or too small? It is limited to a usable range.
- What happens if the same day's morning practice is done twice? The latest finished one sets Today's Virtue and its passage, and both records are kept.
- What happens if the day rolls over at midnight while the sidebar is showing? The daily pick changes to the new date's pick; a virtue chosen in yesterday's practice no longer applies, and both status indicators reset.
- What happens to a practice left unfinished at midnight? It is kept as an unfinished record and cannot be resumed the next day.
- What happens if storage is full or unwritable? The user is told, and existing records stay intact.
- What happens when the extension is disabled? It removes the sidebar and releases everything it created.
- What happens when a reminder fires? It never contains journal content.

## Requirements *(mandatory)*

### Functional Requirements

**Desktop integration**

- **FR-001**: The product MUST provide a persistent sidebar on the GNOME desktop.
- **FR-002**: The user MUST be able to place the sidebar on the left or right and set its width.
- **FR-003**: The sidebar MUST remain visible across workspace changes.
- **FR-004**: The user MUST be able to hide the sidebar temporarily and restore it.
- **FR-005**: The product MUST restore the sidebar configuration across desktop sessions.
- **FR-006**: The sidebar MUST NOT block interaction with the desktop outside its bounds.
- **FR-007**: The sidebar MUST NOT be drawn over the lock or login screens.
- **FR-055**: The sidebar MUST hide while a full-screen window is in front on its monitor, and return when it is not.

**Sidebar presentation**

- **FR-008**: The sidebar MUST show today's virtue: the one chosen in today's latest finished morning practice, or else the daily pick from bundled content.
- **FR-009**: The sidebar MUST show today's passage: the daily pick for the date, or, once a morning practice with a chosen virtue is finished, a passage associated with that virtue. The same date and virtue always give the same passage.
- **FR-010**: The sidebar MUST show a concise Stoic reminder.
- **FR-011**: The sidebar MUST give direct access to The Pause.
- **FR-012**: The sidebar MUST show two practice indicators, Morning and Evening, each as Not started, In progress or Completed, with no percentage or score.
- **FR-053**: Activating Daily Practice Status MUST open morning practice before noon and evening reflection from noon, and the user MUST be able to switch to the other practice.
- **FR-013**: Content MUST stay static unless the user changes it or an intentional daily update occurs; it MUST NOT rotate or animate.
- **FR-014**: The user MUST be able to turn Meeting mode on and off manually. It MUST change only the Stoic Reminder section, to a meeting reminder, and MUST start off in every new desktop session.

**Daily practice**

- **FR-015**: The product MUST guide a morning practice covering virtue, challenges, control, a passage and an intention.
- **FR-016**: The product MUST guide an evening reflection covering what went well, disturbance, virtue and improvement.
- **FR-017**: Every practice question MUST be optional.
- **FR-018**: The product MUST NOT show scores, streaks or penalties.
- **FR-019**: Practice answers MUST be saved locally as they are entered, and a practice MUST be marked complete only when the user explicitly finishes it.
- **FR-054**: Evening reflection MUST show today's morning intention when one exists, and the user MUST be able to reopen and read any journal entry saved today.

**The Pause**

- **FR-020**: The product MUST offer Quick Reset and Deep Reflection.
- **FR-021**: The user MUST be able to categorise the disturbance and optionally add free text.
- **FR-022**: The product MUST give contextual Stoic guidance for each category.
- **FR-023**: Guidance MUST NOT present itself as diagnosis or therapy.
- **FR-056**: Guidance MUST treat emotions as natural, never as failure, and MUST NOT encourage suppressing emotion or condemning oneself for feeling it.
- **FR-024**: Quick Reset MUST guide the user through naming the disturbance, what is and is not in their control, and a response. Deep Reflection MUST guide the user through the event, judgement, control, the virtues and a response.
- **FR-057**: Every step of The Pause MUST be skippable, so the user can go straight to choosing a response.
- **FR-025**: A Pause session that is abandoned or completed without saving MUST leave no personal record. Only a saved session creates a journal entry. This applies to both Quick Reset and Deep Reflection.

**Journal storage**

- **FR-031**: Morning intentions, evening reflections and saved Pause sessions MUST be stored locally as journal entries.

**Configuration**

- **FR-035**: The user MUST be able to configure appearance and background opacity.
- **FR-036**: The user MUST be able to configure keyboard shortcuts, including one to toggle Meeting mode.
- **FR-037**: The user MUST be able to configure daily reminders.

**Privacy and reliability**

- **FR-039**: Personal information MUST be stored locally only, readable and writable by the owning user alone. It is not separately encrypted.
- **FR-040**: Every feature MUST work without internet access.
- **FR-041**: The product MUST NOT collect or transmit personal usage information, journal content or behavioural analytics.
- **FR-042**: An interrupted activity MUST NOT corrupt existing records.
- **FR-043**: The user MUST be able to permanently delete all personal data.
- **FR-044**: The product MUST NOT use the microphone or camera, monitor desktop activity, or infer emotion automatically.
- **FR-045**: Notifications MUST NOT contain journal content.
- **FR-046**: Personal data MUST be kept separate from bundled philosophical content.

**Bundled content**

- **FR-058**: Each bundled passage MUST record its author, work, translation, translator, edition and the basis for its public-domain status.
- **FR-059**: Each bundled passage MUST be associated with at least one virtue, and each virtue MUST have at least one passage.

**Quality**

- **FR-047**: The sidebar and all screens MUST be fully usable by keyboard.
- **FR-048**: Every control MUST have an accessible name and a logical focus order, all screens MUST be usable with a screen reader, and text MUST follow the desktop text-scaling setting.
- **FR-049**: The product MUST follow GNOME visual conventions and avoid unsupported or deprecated GNOME interfaces.
- **FR-050**: Disabling the extension MUST release everything it created.
- **FR-051**: The product MUST support GNOME Shell 50.x and 51.x, and the supported versions MUST be documented.

#### Retired requirement numbers

Numbers are kept from the full product specification for traceability. These are not part of this spec:

| Requirement | Was | Status |
|---|---|---|
| FR-026 | Searchable Stoic library | Out of scope: Phase 3 |
| FR-027 | Passage explanation, interpretation and reflective question | Out of scope: Phase 3 |
| FR-028 | Quotation / paraphrase / interpretation label | Out of scope: Phase 3 |
| FR-029 | Saved passages | Out of scope: Phase 3 |
| FR-030 | Situational exercises | Out of scope: Phase 3 |
| FR-032 | Journal browsing, filtering, editing, export | Out of scope: Phase 4 (today's entries only, FR-054) |
| FR-033 | Pattern observations | Out of scope: Phase 4 |
| FR-034 | Configure position and dimensions | Merged into FR-002 |
| FR-038 | Configure Meeting mode behaviour | Removed: Meeting mode is session-only with no settings beyond its shortcut (FR-036) |
| FR-052 | Optional intelligence | Out of scope: Phase 5 |

### Key Entities

- **Virtue**: One of the four Stoic virtues, with a definition and reflection prompts. Bundled content.
- **Passage**: A direct quotation from a public-domain translation, with author, work, translation, translator, edition, public-domain basis, an optional short explanation (not shown in this release) and one or more associated virtues. Shown in the sidebar and in morning practice. Bundled content. Paraphrases and modern interpretations are Phase 3 (FR-028).
- **Practice Record**: A morning or evening practice for a date, with its answers, chosen virtue and state (in progress or completed).
- **Pause Session**: A Quick Reset or Deep Reflection with category, optional text and chosen response. It exists only while open; it is persisted only when saved, as a Journal Entry.
- **Journal Entry**: A dated, user-owned record: a morning intention, an evening reflection or a saved Pause session.
- **Sidebar Configuration**: Position, width, opacity, appearance, shortcuts, reminders and hidden state. Meeting mode state is not part of it.
- **Meeting Reminder**: A short reminder shown in Meeting mode. Bundled content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open The Pause and finish a Quick Reset in 60 seconds or less.
- **SC-002**: A user can finish a morning or evening practice in 5 minutes or less.
- **SC-003**: Over 24 hours of idle use, the sidebar content changes only at local midnight, to the new date's pick, and never animates or rotates.
- **SC-004**: 100% of clicks and keystrokes outside the sidebar bounds reach the application underneath.
- **SC-005**: After log out and log in, 100% of saved configuration values are restored and Meeting mode is off.
- **SC-006**: After any interruption (crash, logout, power loss) during a save, 100% of previously saved records remain readable.
- **SC-007**: With networking disabled, 100% of features work.
- **SC-008**: Network traffic captured over a full day of use shows zero connections initiated by the product.
- **SC-009**: After a delete-all request, zero personal records remain.
- **SC-010**: Every screen can be completed with the keyboard alone.
- **SC-011**: Disabling the extension leaves no sidebar, no running timers and no leftover shortcuts.
- **SC-012**: Every acceptance scenario passes on both GNOME Shell 50.x and GNOME Shell 51.x.
- **SC-013**: Every screen can be completed with a screen reader, and every control is announced with a meaningful name.
- **SC-014**: After any number of Pause sessions that are abandoned or completed without saving, zero personal records of them exist.
- **SC-015**: 100% of bundled passages carry a translation, edition and public-domain basis, and every virtue has at least one passage.

## Assumptions

- Defaults come from the product specification: right side, 270 px wide, full work-area height, 94% opacity, content rotation off, no animation, visible on all workspaces.
- "Intentional daily update" means the daily pick changes once per day when the date changes, and Today's Virtue and its passage also change when the user finishes morning practice. Nothing else changes sidebar content.
- The day starts at local midnight. Noon local time divides morning from evening for FR-053; it is a default, not a restriction.
- The four virtues are wisdom, courage, justice and temperance.
- On multiple monitors the sidebar is on the primary monitor.
- Bundled passages start as a curated set of public-domain translations of Marcus Aurelius, Epictetus and Seneca. The plan identifies the specific editions.
- Journal storage format, how saves are made safe against interruption, and where the practice screens are shown are design decisions for the plan step.
- Daily reminders are off until the user turns them on.
- Phase 1 is Stories 1 to 3; Phase 2 is Stories 4 and 5.

## Out of Scope

- Phase 3 (Stoic library, search, saved passages, situational exercises), Phase 4 (journal history beyond today, filtering, editing, export, pattern observations) and Phase 5 (optional AI). Each gets its own spec.
- Choosing which monitor the sidebar uses.
- Accounts, cloud sync or any cloud service.
- Scoring, streaks, gamification or engagement metrics.
- Psychological diagnosis, therapy or crisis support.
- Reading microphone, camera, meeting applications or desktop activity.
- Automatic detection of the user's emotional state.
