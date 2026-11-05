// T027 (US2): Quick Reset acceptance over the Foundational modules.
import {assert, assertDeepEqual, assertEqual} from './assert.js';
import {freshRoot, shippedContent, todayKey, waitForEntries} from './helpers.js';
import {guidanceFor} from '../extension/lib/content.js';
import {getFlow} from '../extension/lib/flows.js';
import {Store} from '../extension/lib/store.js';

const CATEGORIES = ['anger', 'anxiety', 'frustration', 'conflict', 'overwhelm',
    'self-criticism', 'disappointment', 'general-disturbance'];

// US2-AS2
export function testEachCategoryGivesItsOwnGuidanceAndAResponse() {
    const content = shippedContent();
    const seen = new Set();
    for (const id of CATEGORIES) {
        const g = guidanceFor(content, id);
        for (const part of ['acknowledge', 'judgement', 'control'])
            assert(g[part]?.trim(), `${id} has ${part} guidance`);
        assert(g.responses.length >= 1, `${id} offers a response`);
        assert(!seen.has(g.acknowledge), `${id} guidance is its own`);
        seen.add(g.acknowledge);
    }
}

// US2-AS3, US2-AS4, FR-057
export function testStepsRunInOrderAndResponseIsReachableFromEachEarlierStep() {
    const flow = getFlow('quick-reset');
    assertEqual(flow.persist, 'on-save');
    assertDeepEqual(flow.steps.map(s => s.id), ['identify', 'control', 'response', 'conclude']);
    const response = flow.steps.findIndex(s => s.id === 'response');
    // Skip to response jumps from any earlier step; nothing on the way can be required.
    for (const step of flow.steps.slice(0, response))
        assert(!step.required && step.fields.every(f => !f.required), `${step.id} can be passed`);
}

// US2-AS5, US2-AS6, SC-014
export async function testAnUnsavedSessionLeavesNoRecord() {
    const root = freshRoot();
    const store = new Store(root);
    await store.loadDay(todayKey());
    // A whole session happens in dialog memory; the store sees nothing until Save.
    store.flush();
    assert(!root.query_exists(null), 'no personal data directory is created');
    assertEqual(store.entries().length, 0);
}

// FR-025
export async function testSaveWritesExactlyOneCompletedEntry() {
    const root = freshRoot();
    const store = new Store(root);
    const key = todayKey();
    await store.loadDay(key);
    store.addEntry({kind: 'quick-reset', createdAt: '2026-11-05T08:00:00+10:00',
        answers: {categoryId: 'anger', text: 'A curt email.', responseId: 'pause-before-replying'}});
    const day = await waitForEntries(root, key, 1);
    const [entry] = day.entries;
    assertEqual(entry.kind, 'quick-reset');
    assertEqual(entry.state, 'completed');
    assert(entry.finishedAt, 'finishedAt is set');
    assertEqual(entry.answers.categoryId, 'anger');
}
