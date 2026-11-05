// Kept apart from run.js: a test importing the entry module would deadlock on its top-level await.
export function assert(cond, msg = 'assertion failed') {
    if (!cond)
        throw new Error(msg);
}

export function assertEqual(actual, expected, msg = '') {
    if (actual !== expected)
        throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`.trim());
}

export function assertDeepEqual(actual, expected, msg = '') {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e)
        throw new Error(`${msg} expected ${e}, got ${a}`.trim());
}
