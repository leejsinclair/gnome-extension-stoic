// T029 (US3): privacy tripwire. No extension code can reach the network, run programs or watch windows.
import Gio from 'gi://Gio';
import {assert} from './assert.js';

const FORBIDDEN = ['gi://Soup', 'gi://Gst', 'Gio.Socket', 'Gio.Resolver', 'Gio.NetworkMonitor',
    'Shell.WindowTracker', '\'window-created\'', 'focus-window', 'GLib.spawn', 'Gio.Subprocess',
    'http://', 'https://'];

function jsFiles(dir, out = []) {
    const iter = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    for (let info; (info = iter.next_file(null));) {
        const child = dir.get_child(info.get_name());
        if (info.get_file_type() === Gio.FileType.DIRECTORY)
            jsFiles(child, out);
        else if (info.get_name().endsWith('.js'))
            out.push(child);
    }
    return out;
}

// US3-AS3, US3-AS4, FR-040, FR-041, FR-044
export function testExtensionCodeUsesNoNetworkProcessOrWindowWatching() {
    const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_child('extension');
    const files = jsFiles(root);
    assert(files.length >= 10, `scanned ${files.length} files`);
    const hits = [];
    for (const file of files) {
        const text = new TextDecoder().decode(file.load_contents(null)[1]);
        for (const word of FORBIDDEN) {
            if (text.includes(word))
                hits.push(`${root.get_relative_path(file)}: ${word}`);
        }
    }
    assert(hits.length === 0, `forbidden use: ${hits.join('; ')}`);
}
