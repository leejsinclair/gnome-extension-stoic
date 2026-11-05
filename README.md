# Stoic Companion

A quiet Stoic sidebar for the GNOME desktop. It shows today's virtue, a thought to carry, a short reminder, a way into The Pause, and the state of your morning and evening practice. Nothing in it moves or rotates during the day.

- **The Pause**: a Quick Reset or a Deep Reflection when something disturbs you. Nothing is kept unless you choose Save.
- **Morning practice and evening reflection**: answers are saved as you go, and the practice is complete only when you choose Finish.
- **Meeting mode**: swaps the Stoic Reminder for a meeting reminder. It is off at the start of every session and is only ever turned on by you.

## Supported versions

GNOME Shell 50.x and 51.x, on Wayland.

## Install

Requires `glib-compile-schemas`, `gnome-extensions` and `gjs`.

```bash
make pack       # builds dist/stoic-companion@leejsinclair.github.io.shell-extension.zip
make install    # installs that zip for your user
```

Log out and back in, then enable it with `gnome-extensions enable stoic-companion@leejsinclair.github.io` or the Extensions app.

For development: `make test` runs the unit tests (`make test FILTER=store` runs one file), `make lint` runs ESLint (run `npm install` once first; Node is needed for linting only), and `make devkit` starts a nested Shell. Use `XDG_DATA_HOME=$(mktemp -d) make devkit` to keep your own journal out of it.

## Privacy

- Everything stays on this computer. The extension makes no network connections, sends no telemetry, and does not watch your windows or applications.
- Your entries are stored as one JSON file per day under `~/.local/share/stoic-companion/days/`. The folders are readable only by you (mode 0700) and the files are mode 0600. There is no extra encryption.
- Notifications never contain anything you wrote.
- **Delete all personal data…** in the top-bar menu removes the whole `stoic-companion` folder after you confirm. Your settings are kept.

## Content sources

The passages are direct quotations from translations in the public domain worldwide. Each is copied word for word from the [Standard Ebooks](https://standardebooks.org) edition named below. Standard Ebooks modernizes some spellings but never the wording or grammar. Their own contributions are dedicated to the public domain under CC0. Thanks to Standard Ebooks for these editions.

| Author | Works quoted | Translator | First published | Edition used | Public-domain basis |
|---|---|---|---|---|---|
| Marcus Aurelius | Meditations | George Long (1800–1879) | 1862 | [Standard Ebooks, 2014](https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long) | Published 1862; translator died 1879 |
| Epictetus | Discourses | George Long | 1877 | [Standard Ebooks, 2020](https://standardebooks.org/ebooks/epictetus/discourses/george-long) | Published 1877; translator died 1879 |
| Epictetus | Enchiridion | George Long | 1877 | [Standard Ebooks *Short Works*, 2022](https://standardebooks.org/ebooks/epictetus/short-works/george-long) | Published 1877; translator died 1879 |
| Seneca | On Anger, On the Shortness of Life, On Peace of Mind, On Providence | Aubrey Stewart (1844–1918) | 1889, *Minor Dialogues* | [Standard Ebooks *Dialogues*, 2016](https://standardebooks.org/ebooks/seneca/dialogues/aubrey-stewart) | Published 1889; translator died 1918 |

Aubrey Stewart's dates come from his [Wikisource author page](https://en.wikisource.org/wiki/Author:Aubrey_Stewart) and the [Project Gutenberg catalogue](https://www.gutenberg.org/ebooks/64576). Work titles and section numbers follow the Standard Ebooks texts.

The Stoic reminders, meeting reminders, Pause guidance and prompts are original modern writing for this extension.
