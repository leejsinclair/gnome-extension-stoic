// T030 (US4): morning and evening practice over a temp-dir Store plus buildTodayView.
import {assert, assertEqual} from './assert.js';
import {freshRoot, keysOf, readDay, shippedContent, todayKey, waitForEntries} from './helpers.js';
import {Store} from '../extension/lib/store.js';
import {buildTodayView, passageFor, practiceState} from '../extension/lib/today.js';

async function open(root = freshRoot()) {
    const store = new Store(root);
    await store.loadDay(todayKey());
    return {root, store};
}

const view = store => buildTodayView({content: shippedContent(), key: todayKey(), entries: store.entries(), meetingMode: false});

function finishMorning(store, answers) {
    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {currentStep: 'intention', answers});
    store.finishEntry(entry.id);
    return entry.id;
}

// US4-AS4, US4-AS9
export async function testAHalfAnsweredMorningIsInProgressAndResumes() {
    const {root, store} = await open();
    const entry = store.resumeOrStart('morning');
    store.updateEntry(entry.id, {currentStep: 'control', answers: {virtueId: 'courage', challenges: 'A hard review.'}});
    store.flush();
    assertEqual(view(store).morning, 'in-progress');

    const {store: again} = await open(root);
    const resumed = again.resumeOrStart('morning');
    assertEqual(resumed.id, entry.id, 'the same entry resumes');
    assertEqual(resumed.currentStep, 'control');
    assertEqual(resumed.answers.challenges, 'A hard review.');
}

// US4-AS1
export async function testFinishingWithCourageSetsTodaysVirtueAndPassage() {
    const {store} = await open();
    finishMorning(store, {virtueId: 'courage'});
    const v = view(store);
    assertEqual(v.morning, 'completed');
    assertEqual(v.virtue.id, 'courage');
    assertEqual(v.virtue.chosen, true);
    assertEqual(v.passage.id, passageFor(shippedContent(), todayKey(), 'courage').id);
}

// US4-AS3, FR-017
export async function testFinishingWithEveryAnswerBlankStillCompletes() {
    const {root, store} = await open();
    finishMorning(store, {challenges: '   ', intention: ''});
    const [entry] = (await waitForEntries(root, todayKey(), 1)).entries;
    assertEqual(entry.state, 'completed');
    assertEqual(Object.keys(entry.answers).length, 0, 'blank answers are not stored');
}

export async function testASecondMorningAddsAnEntryAndTheLatestSetsTheVirtue() {
    const {store} = await open();
    finishMorning(store, {virtueId: 'courage'});
    finishMorning(store, {virtueId: 'justice'});
    assertEqual(store.entries().filter(e => e.kind === 'morning').length, 2);
    assertEqual(view(store).virtue.id, 'justice');
}

// US4-AS6, FR-054
export async function testTheEveningViewCarriesTodaysIntention() {
    const {store} = await open();
    finishMorning(store, {intention: 'Speak plainly and listen first.'});
    const evening = store.resumeOrStart('evening');
    store.updateEntry(evening.id, {answers: {wentWell: 'The review.'}});
    const v = view(store);
    assertEqual(v.intention, 'Speak plainly and listen first.');
    assertEqual(practiceState(store.entries(), 'evening'), 'in-progress');
}

// US4-AS5, US4-AS8, FR-018
export async function testNoScoreStreakOrCountAnywhere() {
    const {root, store} = await open();
    finishMorning(store, {virtueId: 'wisdom', intention: 'Be patient.'});
    const day = await waitForEntries(root, todayKey(), 1);
    const keys = [...keysOf(day), ...keysOf(view(store))];
    const bad = keys.filter(k => /score|streak|count|percent|total|rating/i.test(k));
    assert(bad.length === 0, `scoring fields found: ${bad.join(', ')}`);
}

// US4-AS10, SC-009
export async function testDeleteAllLeavesNoFiles() {
    const {root, store} = await open();
    finishMorning(store, {virtueId: 'temperance'});
    await waitForEntries(root, todayKey(), 1);
    await store.deleteAll();
    assert(!root.query_exists(null), 'the data directory is gone');
    assertEqual(readDay(root, todayKey()), null);
    assertEqual(view(store).morning, 'not-started');
}
