UUID := stoic-companion@leejsinclair.github.io
ZIP  := dist/$(UUID).shell-extension.zip

.PHONY: schemas test lint pack install devkit

schemas:
	glib-compile-schemas extension/schemas

test:
	gjs -m tests/run.js $(FILTER)

lint:
	npx --no-install eslint extension tests

pack: schemas
	mkdir -p dist
	gnome-extensions pack extension/ --force --out-dir=dist \
		--extra-source=lib --extra-source=ui --extra-source=content

install: pack
	gnome-extensions install --force $(ZIP)

devkit:
	dbus-run-session gnome-shell --devkit --wayland
