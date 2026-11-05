# Stoic Companion

## Product, UX and Technical Specification — Revision 2.0

**Platform:** GNOME Desktop / Linux  
**Primary interface:** Persistent GNOME Shell sidebar  
**Interaction model:** Static, user-initiated  
**Architecture:** GNOME Shell extension with optional companion application  
**Product philosophy:** Integrated Stoic Practice

---

## 1. Product vision

Stoic Companion is a persistent desktop companion that helps users cultivate and apply Stoic philosophy in everyday life.

It supports two equally important activities:

- Cultivation through daily practice, philosophical learning and reflection.
- Application through deliberate examination of difficult situations and emotional disturbances.

The application should be a quiet, permanent presence on the desktop, encouraging thoughtful behaviour without demanding attention.

Its guiding principle is:

**Prepare the mind. Meet the moment. Examine the response. Return to what matters.**

## 2. Product experience

The product consists of five integrated capabilities:

1. Persistent desktop sidebar.
2. Daily practice.
3. The Pause.
4. Stoic Wisdom.
5. Personal Reflection.

The sidebar is the primary interface and remains available during normal desktop activities, including meetings.

## 3. Persistent sidebar

### 3.1 Purpose

Provide a permanent, unobtrusive philosophical presence on the desktop.

### 3.2 Layout

The sidebar contains five fixed sections:

1. Today's Virtue.
2. A Thought to Carry.
3. Stoic Reminder.
4. The Pause.
5. Daily Practice Status.

### 3.3 Default configuration

| Property | Default |
|---|---|
| Position | Right |
| Width | 270 px |
| Height | Available work area |
| Background opacity | 94% |
| Visibility | Persistent |
| Interaction | User initiated |
| Content rotation | Disabled |
| Animation | None |
| Desktop coverage | Overlay |
| Workspace behaviour | Visible across workspaces |

### 3.4 Behaviour

The sidebar shall:

- Remain visible during normal desktop use.
- Maintain its position and dimensions.
- Present static content.
- Avoid animations and attention-seeking behaviour.
- Allow interaction with underlying applications outside its bounds.
- Support temporary hiding.
- Restore its configuration after desktop login.
- Remain visible during workspace changes.
- Avoid covering lock and login screens.

### 3.5 Meeting mode

Meeting mode is a manually activated content preset.

It retains the same layout while displaying meeting-oriented reminders.

Examples:

- Listen to understand before responding.
- Be prepared to have your assumptions challenged.
- Focus on the quality of your contribution, not controlling the outcome.
- Disagree without becoming disagreeable.
- Remember that you control your judgement and actions, not the decisions of others.

Meeting mode does not access microphones, cameras, meeting applications or desktop activity.

## 4. Daily practice

### 4.1 Morning practice

Target duration: 2–5 minutes.

The user:

1. Selects a daily virtue.
2. Considers possible challenges.
3. Examines what is within their control.
4. Reads a philosophical passage.
5. Records a daily intention.

All questions are optional.

### 4.2 Evening practice

Target duration: 2–5 minutes.

The user reflects on:

1. What went well?
2. Where did I become disturbed?
3. Did I act according to my chosen virtue?
4. What could I improve tomorrow?

No scoring, streaks or penalties.

## 5. The Pause

### 5.1 Purpose

Provide an immediate Stoic intervention when the user experiences disturbance.

### 5.2 Quick Reset

Target duration: 30–60 seconds.

The user:

1. Identifies the disturbance.
2. Considers what is within their control.
3. Selects a deliberate response.
4. Concludes the intervention.

### 5.3 Deep Reflection

Target duration: 2–5 minutes.

The user:

1. Recognises the disturbance.
2. Describes the event.
3. Separates the event from their judgement.
4. Identifies controllable and uncontrollable factors.
5. Considers the four virtues.
6. Chooses a response.
7. Optionally saves the reflection.

### 5.4 Contextual guidance

Support categories include:

- Anger.
- Anxiety.
- Frustration.
- Conflict.
- Overwhelm.
- Self-criticism.
- Disappointment.
- General disturbance.

Guidance must be grounded in Stoic principles and must not present itself as psychological diagnosis or therapy.

## 6. Stoic Wisdom

Provide a curated library based initially on:

- Marcus Aurelius.
- Epictetus.
- Seneca.

Organise content by author, work and philosophical theme.

Each passage should contain attribution, source, explanation, practical interpretation and a reflective question.

Support saved passages and hypothetical situational exercises.

Distinguish direct quotations from paraphrases and modern interpretations.

## 7. Personal Reflection

Maintain a private journal containing:

- Morning intentions.
- Evening reflections.
- Pause sessions.
- Situational exercises.
- Manual entries.

Support browsing, filtering, editing, deleting and exporting.

Future pattern recognition may identify recurring themes, but must present these as suggestions rather than psychological conclusions.

## 8. Functional requirements

### Desktop integration

**FR-001:** Provide a persistent GNOME Shell sidebar.

**FR-002:** Allow left or right positioning and configurable width.

**FR-003:** Preserve the sidebar across workspace changes.

**FR-004:** Support temporary hide and restore.

**FR-005:** Restore configuration across desktop sessions.

**FR-006:** Avoid blocking interaction with the underlying desktop outside the sidebar.

### Sidebar presentation

**FR-007:** Display today's selected virtue.

**FR-008:** Display a selected philosophical passage.

**FR-009:** Display a concise Stoic reminder.

**FR-010:** Provide direct access to The Pause.

**FR-011:** Display daily practice completion status.

**FR-012:** Keep content static unless explicitly changed by the user or through an intentional daily update.

**FR-013:** Provide manually activated Meeting mode.

### Daily practice

**FR-014:** Support guided morning practice.

**FR-015:** Support guided evening reflection.

**FR-016:** Save completed practices locally.

### The Pause

**FR-017:** Provide Quick Reset and Deep Reflection.

**FR-018:** Allow disturbance categorisation and optional free-text input.

**FR-019:** Provide contextual Stoic guidance.

**FR-020:** Guide the user through judgement, control, virtue and response.

**FR-021:** Allow sessions to be completed, abandoned or saved.

### Learning and reflection

**FR-022:** Provide a searchable Stoic library.

**FR-023:** Support thematic categorisation and saved passages.

**FR-024:** Provide situational exercises.

**FR-025:** Maintain a private personal journal.

**FR-026:** Support journal browsing, filtering, editing, deletion and export.

### Configuration

**FR-027:** Configure sidebar position and dimensions.

**FR-028:** Configure appearance and opacity.

**FR-029:** Configure keyboard shortcuts.

**FR-030:** Configure daily reminders.

**FR-031:** Configure Meeting mode behaviour.

### Privacy and reliability

**FR-032:** Store personal information locally.

**FR-033:** Operate without internet connectivity.

**FR-034:** Avoid analytics and telemetry by default.

**FR-035:** Ensure interrupted activities do not corrupt existing records.

**FR-036:** Support permanent deletion of personal data.

## 9. Non-functional requirements

- Minimal desktop performance impact.
- Responsive sidebar interactions.
- Support keyboard navigation.
- Support accessibility and text scaling.
- Follow GNOME visual conventions where appropriate.
- Avoid unsupported or deprecated GNOME APIs.
- Clean up all extension resources when disabled.
- Support explicitly documented GNOME Shell versions.
- Keep personal data separate from bundled philosophical content.

## 10. Technical architecture

### GNOME Shell extension

Responsible for:
- Sidebar rendering.
- Desktop integration.
- Workspace and monitor behaviour.
- Visibility and positioning.
- Keyboard shortcuts.
- Interaction routing.

Use GJS and GNOME Shell UI facilities.

### Content and practice modules

Responsible for:
- Daily practice workflows.
- Pause workflows.
- Stoic passages.
- Situational exercises.
- Virtue definitions.
- Reflection prompts.

Keep philosophical content separate from presentation code.

### Persistence

Use GSettings for extension configuration and evaluate SQLite or structured local storage for journal and practice records.

### Preferences

Use GTK4 and libadwaita for configuration screens.

### Optional companion application

Use a separate GTK4/libadwaita application only if the extended journal and library experience requires a dedicated interface.

## 11. Privacy principles

- No account required.
- No cloud service required.
- No microphone or camera access.
- No desktop activity monitoring.
- No automatic emotional inference.
- No journal content in notifications.
- No external transmission of personal reflections.
- User-controlled export and deletion.

## 12. Delivery phases

### Phase 1 — Persistent desktop companion

- GNOME Shell integration.
- Static sidebar.
- Daily virtue.
- Philosophical thought.
- Stoic reminder.
- Quick Reset.
- Meeting mode.
- Local settings.

### Phase 2 — Daily practice

- Morning intention.
- Evening reflection.
- Deep Reflection.
- Local journal persistence.

### Phase 3 — Philosophical learning

- Stoic library.
- Search and themes.
- Saved passages.
- Situational exercises.

### Phase 4 — Personal reflection

- Journal history.
- Filtering.
- Export.
- Pattern observations.

### Phase 5 — Optional intelligence

- AI-assisted reflection.
- Personalised reading suggestions.
- Contextual exercises.

AI functionality must remain optional and must never replace user judgement.

## 13. Product success

Success is measured by meaningful philosophical practice rather than application engagement.

The product should help users:

- Establish a sustainable daily practice.
- Recognise disturbances earlier.
- Distinguish events from judgements.
- Identify what they can influence.
- Respond with greater wisdom and restraint.
- Develop familiarity with the four virtues.
- Gradually internalise Stoic principles.

The ultimate success is a user who increasingly practises Stoicism without needing the application to remind them.

**The companion is a tool for developing independence, not dependence.**

## Setup

Speckit: [Speckit](https://github.com/github/spec-kit)

Speckit extensions:

* [Grill me integrated](https://github.com/leejsinclair/speckit-grill-specify)
* [TDD integrated](https://github.com/leejsinclair/speckit-tdd-integrated)
* [Spec Viewer and Kanban Board](https://github.com/leejsinclair/rich-specification-viewer)
* [Claude Mod - Mini Kanban](https://github.com/leejsinclair/speckit-mod-micro-kanban)