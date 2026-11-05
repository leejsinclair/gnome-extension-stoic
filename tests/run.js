// Minimal test runner: gjs -m tests/run.js [filter]
import Gio from 'gi://Gio';
import System from 'system';

export {assert, assertEqual, assertDeepEqual} from './assert.js';

const dir = Gio.File.new_for_uri(import.meta.url).get_parent();
const filter = System.programArgs[0] ?? '';

const names = [];
const iter = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
for (let info; (info = iter.next_file(null));) {
    const name = info.get_name();
    if (name.endsWith('.test.js') && name.includes(filter))
        names.push(name);
}
names.sort();

let passed = 0, failed = 0;
for (const name of names) {
    const mod = await import(`./${name}`);
    for (const [fn, test] of Object.entries(mod)) {
        if (!fn.startsWith('test') || typeof test !== 'function')
            continue;
        try {
            await test();
            passed++;
            print(`ok   ${name} ${fn}`);
        } catch (e) {
            failed++;
            print(`FAIL ${name} ${fn}: ${e.message}`);
        }
    }
}

print(`\n${passed} passed, ${failed} failed`);
if (failed > 0 || names.length === 0)
    System.exit(1);
