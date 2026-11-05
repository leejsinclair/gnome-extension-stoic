# Quickstart: build, test and check Stoic Companion by hand

## Build and unit tests

```bash
make schemas      # glib-compile-schemas extension/schemas
make test         # gjs -m tests/run.js; add FILTER=store to run one file
make pack         # gnome-extensions pack extension/ into dist/
```

## Run in a nested Shell

```bash
make install      # gnome-extensions install --force dist/*.zip
make devkit       # dbus-run-session gnome-shell --devkit --wayland
# inside the nested Shell:
gnome-extensions enable stoic-companion@leejsinclair.github.io
```

Use a throwaway data directory so your own journal is untouched: `XDG_DATA_HOME=$(mktemp -d) make devkit`.

## Manual checks, on Shell 50 and on Shell 51

These are the behaviours unit tests cannot reach. Each line names what to do and what must be true.

1. **Sidebar.** Enable the extension. The sidebar is on the right, 270 px wide, full work-area height, and shows the five sections in order. (US1-AS1)
2. **Workspaces and input.** Switch workspace. The sidebar stays. Click and type in a window just beside it, and the window receives the input. (US1-AS2, US1-AS3)
3. **Hide, restore, relog.** Hide the sidebar from the top-bar menu, then restore it with the shortcut. Change the position, width and opacity, then log out and in. Everything is restored and Meeting mode is off. (US1-AS4, US1-AS5, US3-AS5)
4. **Lock screen.** Lock the screen. No sidebar is drawn. Unlock it, and the sidebar returns with Meeting mode as it was. (US1-AS6)
5. **Full screen.** Make a video full screen. The sidebar hides, and returns when the video leaves full screen. (US1-AS9)
6. **Idle.** Leave the sidebar 10 minutes. Nothing moves. Compare screenshots. (US1-AS7)
7. **The Pause.** Open it, pick Anger, use "Skip to response", conclude and choose Done. `ls $XDG_DATA_HOME/stoic-companion/days` shows no new entry. Repeat and choose Save, and exactly one entry appears. (US2, US5-AS4)
8. **Practice.** Start morning practice, answer one question and press Escape. Morning shows In progress. Reopen it, and it resumes. Finish it with Courage. Today's Virtue becomes Courage and the passage changes. (US4-AS1, US4-AS4)
9. **Keyboard and Orca.** With Orca on, reach the sidebar with Ctrl+Alt+Tab. Every control is announced by name, and every flow can be completed without the mouse. (FR-047, FR-048)
10. **Disable.** Disable the extension. The sidebar, the top-bar icon and the shortcuts are gone. `journalctl --user -b | grep -i stoic` shows no errors and no journal text. (FR-050, SC-011)
