// Loads and validates the bundled, read-only content in extension/content/
// (contracts/bundled-content.md, data-model §1). Never touches personal data (FR-046).
import Gio from 'gi://Gio';

export class ContentError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'ContentError';
    }
}

const VIRTUE_IDS = ['wisdom', 'courage', 'justice', 'temperance'];
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
const PASSAGE_KINDS = ['quotation', 'paraphrase', 'interpretation'];
const MIN_PASSAGES_PER_VIRTUE = 3;
// Tone tripwire (R13). Passages are exempt: they are historical quotations.
const DENY = ['diagnos', 'disorder', 'therapy', 'treatment', 'you should not feel', 'failure', 'weak'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readJson(dir, name) {
    const file = dir.get_child(name);
    let bytes;
    try {
        [, bytes] = file.load_contents(null);
    } catch (e) {
        throw new ContentError(`cannot read ${name}: ${e.message}`, {cause: e});
    }
    try {
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        throw new ContentError(`cannot parse ${name}: ${e.message}`, {cause: e});
    }
}

function collection(data, name, key) {
    const list = data?.[key];
    if (!Array.isArray(list))
        throw new ContentError(`${name} has no ${key}[]`);
    return list;
}

/**
 * Reads the five content files from `dir` (a Gio.File).
 * Throws ContentError when a file cannot be read or parsed.
 */
export function loadContent(dir) {
    if (typeof dir === 'string')
        dir = Gio.File.new_for_path(dir);
    const reminders = readJson(dir, 'reminders.json');
    return {
        sources: collection(readJson(dir, 'sources.json'), 'sources.json', 'sources'),
        virtues: collection(readJson(dir, 'virtues.json'), 'virtues.json', 'virtues'),
        passages: collection(readJson(dir, 'passages.json'), 'passages.json', 'passages'),
        reminders: {
            stoic: collection(reminders, 'reminders.json', 'stoic'),
            meeting: collection(reminders, 'reminders.json', 'meeting'),
        },
        categories: collection(readJson(dir, 'guidance.json'), 'guidance.json', 'categories'),
    };
}

const nonEmpty = s => typeof s === 'string' && s.trim().length > 0;
const asList = x => (Array.isArray(x) ? x : []);

function checkIds(list, what, errors) {
    const seen = new Set();
    for (const item of list) {
        const id = item?.id;
        if (typeof id !== 'string' || !KEBAB.test(id))
            errors.push(`${what}: id ${JSON.stringify(id)} is not lowercase kebab-case`);
        else if (seen.has(id))
            errors.push(`${what}: duplicate id ${id}`);
        seen.add(id);
    }
}

function checkTone(text, where, errors) {
    if (!nonEmpty(text)) {
        errors.push(`${where}: text is empty`);
        return;
    }
    const lower = text.toLowerCase();
    for (const word of DENY) {
        if (lower.includes(word))
            errors.push(`${where}: contains denied word "${word}"`);
    }
}

function validateSources(sources, errors) {
    checkIds(sources, 'sources', errors);
    for (const s of sources) {
        for (const f of ['author', 'translation', 'translator', 'edition', 'publicDomainBasis']) {
            if (!nonEmpty(s?.[f]))
                errors.push(`source ${s?.id}: ${f} is empty`);
        }
        if (!Array.isArray(s?.works) || s.works.length === 0 || !s.works.every(nonEmpty))
            errors.push(`source ${s?.id}: works is empty`);
        if (!Number.isInteger(s?.year))
            errors.push(`source ${s?.id}: year is not an integer`);
        if (/to be confirmed|\btbc\b/i.test(s?.publicDomainBasis ?? ''))
            errors.push(`source ${s?.id}: publicDomainBasis is unconfirmed`);
    }
}

function validateVirtues(virtues, errors) {
    checkIds(virtues, 'virtues', errors);
    const ids = virtues.map(v => v?.id).sort();
    if (JSON.stringify(ids) !== JSON.stringify([...VIRTUE_IDS].sort()))
        errors.push(`virtues: ids must be exactly ${VIRTUE_IDS.join(', ')}, got ${ids.join(', ')}`);
    for (const v of virtues) {
        if (!nonEmpty(v?.name))
            errors.push(`virtue ${v?.id}: name is empty`);
        if (!nonEmpty(v?.definition) || v.definition.includes('\n'))
            errors.push(`virtue ${v?.id}: definition is not a single non-empty line`);
        if (!Array.isArray(v?.prompts) || v.prompts.length === 0)
            errors.push(`virtue ${v?.id}: no prompts`);
        else
            v.prompts.forEach((p, i) => checkTone(p, `virtue ${v.id} prompt ${i}`, errors));
    }
}

function validatePassages(passages, sources, virtues, errors) {
    checkIds(passages, 'passages', errors);
    const sourceById = new Map(sources.map(s => [s?.id, s]));
    const virtueIds = new Set(virtues.map(v => v?.id));
    for (const p of passages) {
        const where = `passage ${p?.id}`;
        if (!PASSAGE_KINDS.includes(p?.kind))
            errors.push(`${where}: kind ${JSON.stringify(p?.kind)} is not one of ${PASSAGE_KINDS.join(', ')}`);
        if (!nonEmpty(p?.text))
            errors.push(`${where}: text is empty`);
        if (!nonEmpty(p?.locator))
            errors.push(`${where}: locator is empty`);
        const source = sourceById.get(p?.sourceId);
        if (!source)
            errors.push(`${where}: sourceId ${p?.sourceId} does not resolve`);
        else if (!asList(source.works).includes(p.work))
            errors.push(`${where}: work ${p.work} is not in ${p.sourceId}`);
        if (!Array.isArray(p?.virtueIds) || p.virtueIds.length === 0) {
            errors.push(`${where}: no virtueIds`);
        } else {
            if (new Set(p.virtueIds).size !== p.virtueIds.length)
                errors.push(`${where}: duplicate virtueIds`);
            for (const id of p.virtueIds) {
                if (!virtueIds.has(id))
                    errors.push(`${where}: virtue ${id} does not resolve`);
            }
        }
        if (p?.explanation !== undefined && typeof p.explanation !== 'string')
            errors.push(`${where}: explanation is not a string`);
    }
    for (const id of VIRTUE_IDS) {
        const n = passages.filter(p => asList(p?.virtueIds).includes(id)).length;
        if (n === 0)
            errors.push(`virtue ${id} has no passage (FR-059)`);
        else if (n < MIN_PASSAGES_PER_VIRTUE)
            errors.push(`virtue ${id} has ${n} passages, needs at least ${MIN_PASSAGES_PER_VIRTUE} (SC-015)`);
    }
}

function validateReminders(reminders, errors) {
    for (const list of ['stoic', 'meeting']) {
        const items = reminders?.[list];
        if (!Array.isArray(items) || items.length === 0) {
            errors.push(`reminders.${list} is empty`);
            continue;
        }
        checkIds(items, `reminders.${list}`, errors);
        for (const r of items)
            checkTone(r?.text, `reminders.${list} ${r?.id}`, errors);
    }
}

function validateCategories(categories, errors) {
    const got = categories.map(c => [c?.id, c?.label]);
    if (JSON.stringify(got) !== JSON.stringify(CATEGORIES))
        errors.push(`categories: must be exactly ${CATEGORIES.map(([id]) => id).join(', ')} in order with their labels`);
    for (const c of categories) {
        const where = `category ${c?.id}`;
        for (const f of ['label', 'acknowledge', 'judgement', 'control', 'virtue'])
            checkTone(c?.[f], `${where} ${f}`, errors);
        if (!Array.isArray(c?.responses) || c.responses.length === 0) {
            errors.push(`${where}: no responses`);
            continue;
        }
        checkIds(c.responses, `${where} responses`, errors);
        for (const r of c.responses)
            checkTone(r?.text, `${where} response ${r?.id}`, errors);
    }
}

/**
 * Checks every rule in data-model §1 and contracts/bundled-content.md.
 * Returns [] when valid, otherwise one message per broken rule.
 */
export function validateContent(content) {
    const errors = [];
    const sources = asList(content?.sources);
    const virtues = asList(content?.virtues);
    const passages = asList(content?.passages);
    const categories = asList(content?.categories);
    for (const key of ['sources', 'virtues', 'passages', 'categories']) {
        if (!Array.isArray(content?.[key]))
            errors.push(`${key} is missing`);
    }
    validateSources(sources, errors);
    validateVirtues(virtues, errors);
    validatePassages(passages, sources, virtues, errors);
    validateReminders(content?.reminders, errors);
    validateCategories(categories, errors);
    return errors;
}

/** One entry of guidance.json, or throws ContentError for an unknown category. */
export function guidanceFor(content, categoryId) {
    const category = asList(content?.categories).find(c => c.id === categoryId);
    if (!category)
        throw new ContentError(`unknown category ${categoryId}`);
    return category;
}
