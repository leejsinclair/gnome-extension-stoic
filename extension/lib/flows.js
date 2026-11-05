// Step definitions for the four guided flows (contracts/lib-api.md, "lib/flows.js").
// Pure data: no imports. Step ids are what an entry's `currentStep` stores; field ids
// are the `answers` keys in contracts/journal-storage.md. Every step and field is
// optional (FR-017, FR-057). Prompts are original text written to the tone rule (R13).

export const FLOW_IDS = ['morning', 'evening', 'quick-reset', 'deep-reflection'];

const step = (id, prompt, fields = []) =>
    ({id, prompt, fields: fields.map(([fieldId, input]) => ({id: fieldId, input}))});

const FLOWS = {
    'morning': {
        id: 'morning',
        title: 'Morning practice',
        persist: 'as-you-go',
        switchTo: 'evening',
        steps: [
            step('virtue', 'Which virtue would you like to carry into today?',
                [['virtueId', 'virtue']]),
            step('challenges', 'What might test you today?',
                [['challenges', 'text']]),
            step('control', 'Of those, what is within your control, and what is not?',
                [['inControl', 'text'], ['notInControl', 'text']]),
            step('passage', 'A passage to keep in mind today.',
                [['passageId', 'passage']]),
            step('intention', 'In one line, how do you mean to meet the day?',
                [['intention', 'text']]),
        ],
    },
    'evening': {
        id: 'evening',
        title: 'Evening reflection',
        persist: 'as-you-go',
        switchTo: 'morning',
        steps: [
            step('went-well', 'What went well today?',
                [['wentWell', 'text']]),
            step('disturbance', 'What disturbed you, and what judgement did you add to it?',
                [['disturbance', 'text']]),
            step('virtue', 'Which virtue did you act from today?',
                [['virtueActed', 'virtue']]),
            step('improve', 'What would you do differently next time?',
                [['improvement', 'text']]),
        ],
    },
    'quick-reset': {
        id: 'quick-reset',
        title: 'Quick Reset',
        persist: 'on-save',
        steps: [
            step('identify', 'What are you feeling right now? It is natural to feel it.',
                [['categoryId', 'category'], ['text', 'text']]),
            step('control', 'Notice what is within your control here, and what is not.'),
            step('response', 'Choose how you want to respond.',
                [['responseId', 'response']]),
            step('conclude', 'Take a breath. You can return to this whenever you need it.'),
        ],
    },
    'deep-reflection': {
        id: 'deep-reflection',
        title: 'Deep Reflection',
        persist: 'on-save',
        steps: [
            step('recognise', 'What are you feeling? Naming it is a good first step.',
                [['categoryId', 'category']]),
            step('event', 'What happened, described as plainly as you can?',
                [['event', 'text']]),
            step('judgement', 'What judgement are you adding to what happened?',
                [['judgement', 'text']]),
            step('control', 'What here is within your control, and what is not?',
                [['inControl', 'text'], ['notInControl', 'text']]),
            step('virtues', 'Which virtues could help you meet this?',
                [['virtueIds', 'virtues'], ['virtueNotes', 'text']]),
            step('response', 'Choose how you want to respond.',
                [['responseId', 'response']]),
            step('conclude', 'You have looked at this with care. Take that with you.'),
        ],
    },
};

// Returns a fresh deep copy so callers cannot alter the shared definitions.
export function getFlow(id) {
    const flow = FLOWS[id];
    if (!flow)
        throw new Error(`unknown flow: ${id}`);
    return {
        ...flow,
        steps: flow.steps.map(s => ({...s, fields: s.fields.map(f => ({...f}))})),
    };
}
