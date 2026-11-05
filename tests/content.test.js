// T005: bundled content passes validateContent() and every rule in data-model §1
// and contracts/bundled-content.md (FR-023, FR-056, FR-058, FR-059, SC-015, R12, R13).
import Gio from 'gi://Gio';

import {assert, assertEqual, assertDeepEqual} from './assert.js';

const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const contentDir = root.resolve_relative_path('extension/content');

// Imported lazily so a missing module fails these tests, not the whole runner.
const contentLib = () => import('../extension/lib/content.js');
const flowsLib = () => import('../extension/lib/flows.js');

const VIRTUE_IDS = ['wisdom', 'courage', 'justice', 'temperance'];
const SOURCE_IDS = ['long-meditations-1862', 'long-discourses-1877', 'long-enchiridion-1877', 'stewart-seneca-1889'];
const CATEGORIES = [
    ['anger', 'Anger'],
    ['anxiety', 'Anxiety'],
    ['frustration', 'Frustration'],
    ['conflict', 'Conflict'],
    ['overwhelm', 'Overwhelm'],
    ['self-criticism', 'Self-criticism'],
    ['disappointment', 'Disappointment'],
    ['general-disturbance', 'General disturbance'],
];
const DENY = ['diagnos', 'disorder', 'therapy', 'treatment', 'you should not feel', 'failure', 'weak'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILES = {
    'sources.json': 'sources',
    'virtues.json': 'virtues',
    'passages.json': 'passages',
    'reminders.json': 'stoic',
    'guidance.json': 'categories',
};

async function shipped() {
    const {loadContent} = await contentLib();
    return loadContent(contentDir);
}

const nonEmpty = s => typeof s === 'string' && s.trim().length > 0;

function assertIds(list, what) {
    const ids = list.map(x => x.id);
    for (const id of ids)
        assert(KEBAB.test(id ?? ''), `${what}: id ${JSON.stringify(id)} is not lowercase kebab-case`);
    assertEqual(new Set(ids).size, ids.length, `${what}: ids are not unique`);
}

function assertTone(text, where) {
    assert(nonEmpty(text), `${where}: text is empty`);
    const lower = text.toLowerCase();
    for (const word of DENY)
        assert(!lower.includes(word), `${where}: contains denied word "${word}"`);
}

export async function testShippedContentValidates() {
    const {validateContent} = await contentLib();
    assertDeepEqual(validateContent(await shipped()), [], 'validateContent(shipped)');
}

export function testFilesHaveVersionOne() {
    const decoder = new TextDecoder();
    for (const [name, collection] of Object.entries(FILES)) {
        const [, bytes] = contentDir.get_child(name).load_contents(null);
        const data = JSON.parse(decoder.decode(bytes));
        assertEqual(data.version, 1, `${name} version`);
        assert(Array.isArray(data[collection]), `${name} has no ${collection}[]`);
    }
}

export async function testSourcesComplete() {
    const {sources} = await shipped();
    assertIds(sources, 'sources');
    assertDeepEqual(sources.map(s => s.id).sort(), [...SOURCE_IDS].sort(), 'source ids (R12)');
    for (const s of sources) {
        for (const f of ['author', 'translation', 'translator', 'edition', 'publicDomainBasis'])
            assert(nonEmpty(s[f]), `source ${s.id}: ${f} is empty`);
        assert(Array.isArray(s.works) && s.works.length > 0 && s.works.every(nonEmpty),
            `source ${s.id}: works is empty`);
        assert(Number.isInteger(s.year), `source ${s.id}: year is not an integer`);
        assert(!/to be confirmed|\btbc\b/i.test(s.publicDomainBasis),
            `source ${s.id}: publicDomainBasis is unconfirmed`);
    }
}

export async function testFourVirtuesWithFixedIds() {
    const {virtues} = await shipped();
    assertIds(virtues, 'virtues');
    assertDeepEqual(virtues.map(v => v.id).sort(), [...VIRTUE_IDS].sort(), 'virtue ids');
    for (const v of virtues) {
        assert(nonEmpty(v.name), `virtue ${v.id}: name is empty`);
        assert(nonEmpty(v.definition) && !v.definition.includes('\n'),
            `virtue ${v.id}: definition is not a single non-empty line`);
        assert(Array.isArray(v.prompts) && v.prompts.length > 0, `virtue ${v.id}: no prompts`);
    }
}

export async function testPassageReferencesResolve() {
    const {passages, sources, virtues} = await shipped();
    assertIds(passages, 'passages');
    const sourceById = new Map(sources.map(s => [s.id, s]));
    const virtueIds = new Set(virtues.map(v => v.id));
    for (const p of passages) {
        assertEqual(p.kind, 'quotation', `passage ${p.id} kind`);
        assert(nonEmpty(p.text), `passage ${p.id}: text is empty`);
        assert(nonEmpty(p.locator), `passage ${p.id}: locator is empty`);
        const source = sourceById.get(p.sourceId);
        assert(source, `passage ${p.id}: sourceId ${p.sourceId} does not resolve`);
        assert(source.works.includes(p.work), `passage ${p.id}: work ${p.work} is not in ${p.sourceId}`);
        assert(Array.isArray(p.virtueIds) && p.virtueIds.length > 0, `passage ${p.id}: no virtueIds`);
        assertEqual(new Set(p.virtueIds).size, p.virtueIds.length, `passage ${p.id}: duplicate virtueIds`);
        for (const id of p.virtueIds)
            assert(virtueIds.has(id), `passage ${p.id}: virtue ${id} does not resolve`);
        if (p.explanation !== undefined)
            assertEqual(typeof p.explanation, 'string', `passage ${p.id} explanation`);
    }
}

export async function testThreePassagesPerVirtue() {
    const {passages} = await shipped();
    for (const id of VIRTUE_IDS) {
        const n = passages.filter(p => p.virtueIds.includes(id)).length;
        assert(n >= 3, `virtue ${id} has ${n} passages, needs at least 3 (FR-059, SC-015)`);
    }
}

export async function testEightCategoriesInOrder() {
    const {categories} = await shipped();
    assertDeepEqual(categories.map(c => [c.id, c.label]), CATEGORIES, 'categories');
    for (const c of categories) {
        for (const f of ['acknowledge', 'judgement', 'control', 'virtue'])
            assert(nonEmpty(c[f]), `category ${c.id}: ${f} is empty`);
        assert(Array.isArray(c.responses) && c.responses.length > 0, `category ${c.id}: no responses`);
        assertIds(c.responses, `category ${c.id} responses`);
        for (const r of c.responses)
            assert(nonEmpty(r.text), `category ${c.id} response ${r.id}: text is empty`);
    }
}

export async function testRemindersNonEmpty() {
    const {reminders} = await shipped();
    for (const list of ['stoic', 'meeting']) {
        assert(Array.isArray(reminders[list]) && reminders[list].length > 0, `reminders.${list} is empty`);
        assertIds(reminders[list], `reminders.${list}`);
        for (const r of reminders[list])
            assert(nonEmpty(r.text), `reminders.${list} ${r.id}: text is empty`);
    }
}

export async function testToneDenyList() {
    const {reminders, categories, virtues} = await shipped();
    for (const list of ['stoic', 'meeting']) {
        for (const r of reminders[list])
            assertTone(r.text, `reminders.${list} ${r.id}`);
    }
    for (const c of categories) {
        for (const f of ['label', 'acknowledge', 'judgement', 'control', 'virtue'])
            assertTone(c[f], `category ${c.id} ${f}`);
        for (const r of c.responses)
            assertTone(r.text, `category ${c.id} response ${r.id}`);
    }
    for (const v of virtues)
        v.prompts.forEach((p, i) => assertTone(p, `virtue ${v.id} prompt ${i}`));

    const {FLOW_IDS, getFlow} = await flowsLib();
    for (const id of FLOW_IDS) {
        for (const step of getFlow(id).steps)
            assertTone(step.prompt, `flow ${id} step ${step.id}`);
    }
}

// Smallest content that meets every rule: three passages per virtue, eight categories.
function fixture() {
    return {
        sources: [{
            id: 'src', author: 'A', works: ['W'], translation: 'T', translator: 'X',
            edition: 'Standard Ebooks, 2014 (spelling modernized): https://example.org',
            year: 1862, publicDomainBasis: 'Published 1862; translator died 1879',
        }],
        virtues: VIRTUE_IDS.map(id => ({id, name: id, definition: 'One line.', prompts: ['What matters here?']})),
        passages: VIRTUE_IDS.flatMap(v => [1, 2, 3].map(n => ({
            id: `${v}-${n}`, kind: 'quotation', text: 'Words.', sourceId: 'src',
            work: 'W', locator: `Book I, ${n}`, virtueIds: [v],
        }))),
        reminders: {
            stoic: [{id: 'stoic-one', text: 'Attend to what is yours.'}],
            meeting: [{id: 'listen-first', text: 'Listen to understand before responding'}],
        },
        categories: CATEGORIES.map(([id, label]) => ({
            id, label, acknowledge: 'This is natural.', judgement: 'What judgement is added?',
            control: 'What is yours to choose?', virtue: 'Which virtue helps?',
            responses: [{id: 'pause', text: 'Pause'}, {id: 'breathe', text: 'Take a breath'}],
        })),
    };
}

export async function testValidateAcceptsFixture() {
    const {validateContent} = await contentLib();
    assertDeepEqual(validateContent(fixture()), [], 'validateContent(fixture)');
}

export async function testValidateReportsDanglingSourceId() {
    const {validateContent} = await contentLib();
    const content = fixture();
    content.passages[0].sourceId = 'no-such-source';
    const errors = validateContent(content);
    assert(errors.length > 0, 'dangling sourceId was not reported');
    assert(errors.some(e => e.includes('no-such-source')), `no message names the dangling sourceId: ${errors}`);
}

export async function testValidateReportsVirtueWithoutPassage() {
    const {validateContent} = await contentLib();
    const content = fixture();
    content.passages = content.passages.filter(p => !p.virtueIds.includes('justice'));
    const errors = validateContent(content);
    assert(errors.length > 0, 'virtue with no passage was not reported');
    assert(errors.some(e => e.includes('justice')), `no message names the virtue: ${errors}`);
}
