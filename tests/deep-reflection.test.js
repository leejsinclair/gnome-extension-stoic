// T032 (US5): Deep Reflection acceptance.
import {assert, assertDeepEqual, assertEqual} from './assert.js';
import {freshRoot, todayKey, waitForEntries} from './helpers.js';
import {getFlow} from '../extension/lib/flows.js';
import {Store} from '../extension/lib/store.js';

// US5-AS1
export function testSevenOptionalStepsWithResponseReachableFromEach() {
    const flow = getFlow('deep-reflection');
    assertEqual(flow.persist, 'on-save');
    assertDeepEqual(flow.steps.map(s => s.id),
        ['recognise', 'event', 'judgement', 'control', 'virtues', 'response', 'conclude']);
    const response = flow.steps.findIndex(s => s.id === 'response');
    for (const step of flow.steps.slice(0, response))
        assert(!step.required && step.fields.every(f => !f.required), `${step.id} can be skipped`);
}

// US5-AS2, US5-AS4
export async function testAnUnsavedReflectionLeavesNoFile() {
    const root = freshRoot();
    const store = new Store(root);
    await store.loadDay(todayKey());
    store.flush();
    assert(!root.query_exists(null), 'nothing is written');
}

// US5-AS3, US5-AS4, FR-025
export async function testSaveWritesOneEntryWithVirtueIdsAsAnArray() {
    const root = freshRoot();
    const store = new Store(root);
    const key = todayKey();
    await store.loadDay(key);
    store.addEntry({kind: 'deep-reflection', createdAt: '2026-11-05T09:00:00+10:00', answers: {
        categoryId: 'conflict', event: 'A disagreement in the meeting.', judgement: 'I decided I was disrespected.',
        virtueIds: ['justice', 'temperance'], responseText: 'Talk to them after lunch.',
    }});
    const day = await waitForEntries(root, key, 1);
    const [entry] = day.entries;
    assertEqual(entry.kind, 'deep-reflection');
    assertEqual(entry.state, 'completed');
    assert(Array.isArray(entry.answers.virtueIds), 'virtueIds is stored as an array');
    assertDeepEqual(entry.answers.virtueIds, ['justice', 'temperance']);
    assertEqual(entry.answers.event, 'A disagreement in the meeting.');
}
