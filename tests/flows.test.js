// T007: lib/flows.js against the step and field table in contracts/lib-api.md
// and the answer keys in contracts/journal-storage.md (FR-015, FR-016, FR-020, FR-024).
import {assert, assertEqual, assertDeepEqual} from './assert.js';

// Loaded lazily so a missing module fails these tests, not the whole runner.
const load = () => import('../extension/lib/flows.js');

// The 'response' input is one widget: a suggested-response list plus an own-response
// entry. Its field id is `responseId`; it stores `responseText` when the user writes
// their own (journal-storage.md: "`responseId` or `responseText`").
const RESPONSE_KEYS = ['responseId', 'responseText'];

const EXPECTED = {
    'morning': {
        title: 'Morning practice',
        persist: 'as-you-go',
        switchTo: 'evening',
        steps: [
            ['virtue', [['virtueId', 'virtue']]],
            ['challenges', [['challenges', 'text']]],
            ['control', [['inControl', 'text'], ['notInControl', 'text']]],
            ['passage', [['passageId', 'passage']]],
            ['intention', [['intention', 'text']]],
        ],
    },
    'evening': {
        title: 'Evening reflection',
        persist: 'as-you-go',
        switchTo: 'morning',
        steps: [
            ['went-well', [['wentWell', 'text']]],
            ['disturbance', [['disturbance', 'text']]],
            ['virtue', [['virtueActed', 'virtue']]],
            ['improve', [['improvement', 'text']]],
        ],
    },
    'quick-reset': {
        title: 'Quick Reset',
        persist: 'on-save',
        switchTo: undefined,
        steps: [
            ['identify', [['categoryId', 'category'], ['text', 'text']]],
            ['control', []],
            ['response', [['responseId', 'response']]],
            ['conclude', []],
        ],
    },
    'deep-reflection': {
        title: 'Deep Reflection',
        persist: 'on-save',
        switchTo: undefined,
        steps: [
            ['recognise', [['categoryId', 'category']]],
            ['event', [['event', 'text']]],
            ['judgement', [['judgement', 'text']]],
            ['control', [['inControl', 'text'], ['notInControl', 'text']]],
            ['virtues', [['virtueIds', 'virtues'], ['virtueNotes', 'text']]],
            ['response', [['responseId', 'response']]],
            ['conclude', []],
        ],
    },
};

// contracts/journal-storage.md, "Answer keys by kind".
const ANSWER_KEYS = {
    'morning': ['virtueId', 'challenges', 'inControl', 'notInControl', 'passageId', 'intention'],
    'evening': ['wentWell', 'disturbance', 'virtueActed', 'improvement'],
    'quick-reset': ['categoryId', 'text', ...RESPONSE_KEYS],
    'deep-reflection': ['categoryId', 'event', 'judgement', 'inControl', 'notInControl',
        'virtueIds', 'virtueNotes', ...RESPONSE_KEYS],
};

const INPUTS = ['virtue', 'virtues', 'category', 'text', 'response', 'passage'];

export async function testFlowIds() {
    const {FLOW_IDS} = await load();
    assertDeepEqual(FLOW_IDS, ['morning', 'evening', 'quick-reset', 'deep-reflection'], 'FLOW_IDS');
}

export async function testFlowHeaders() {
    const {FLOW_IDS, getFlow} = await load();
    for (const id of FLOW_IDS) {
        const flow = getFlow(id), want = EXPECTED[id];
        assertEqual(flow.id, id, `${id} id`);
        assertEqual(flow.title, want.title, `${id} title`);
        assertEqual(flow.persist, want.persist, `${id} persist`);
        assertEqual(flow.switchTo, want.switchTo, `${id} switchTo`);
    }
}

export async function testStepsAndFields() {
    const {FLOW_IDS, getFlow} = await load();
    for (const id of FLOW_IDS) {
        const got = getFlow(id).steps.map(s => [s.id, s.fields.map(f => [f.id, f.input])]);
        assertDeepEqual(got, EXPECTED[id].steps, `${id} steps`);
    }
}

export async function testStepsHavePromptsAndAreOptional() {
    const {FLOW_IDS, getFlow} = await load();
    for (const id of FLOW_IDS) {
        const ids = new Set();
        for (const step of getFlow(id).steps) {
            assert(typeof step.prompt === 'string' && step.prompt.trim() !== '',
                `${id}/${step.id} has no prompt`);
            assert(!ids.has(step.id), `${id}/${step.id} is duplicated`);
            ids.add(step.id);
            // Every step can be skipped (FR-017, FR-057): nothing marks a step or field required.
            assert(!step.required, `${id}/${step.id} is required`);
            for (const field of step.fields) {
                assert(INPUTS.includes(field.input), `${id}/${field.id} input ${field.input}`);
                assert(!field.required, `${id}/${field.id} is required`);
            }
        }
    }
}

export async function testFieldIdsAreAnswerKeys() {
    const {FLOW_IDS, getFlow} = await load();
    for (const id of FLOW_IDS) {
        const keys = ANSWER_KEYS[id];
        const covered = new Set();
        for (const step of getFlow(id).steps) {
            for (const field of step.fields) {
                assert(keys.includes(field.id), `${id}/${step.id}: ${field.id} is not an answer key`);
                assert(!covered.has(field.id), `${id}: ${field.id} appears in two steps`);
                covered.add(field.id);
                if (field.input === 'response')
                    RESPONSE_KEYS.forEach(k => covered.add(k));
            }
        }
        assertDeepEqual([...covered].sort(), [...keys].sort(), `${id} answer keys covered`);
    }
}

