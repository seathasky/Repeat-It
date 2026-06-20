# Repeat It

An Ableton Live Extension beta experiment for adding one effect to every track at once.

## What it does

- Right-click any audio or MIDI track.
- Choose `Repeat It: Add Utility to all tracks`, or one of the other configured devices.
- The extension inserts that device at the end of every regular track's device chain.

Included device names:

- Utility
- EQ Eight
- Compressor
- Glue Compressor
- Limiter
- Saturator
- Auto Filter
- Delay
- Reverb

To add third-party effects, edit `DEVICE_NAMES` in `src/extension.ts` and add the exact names Live resolves for those plug-ins. The public beta SDK documents `insertDevice` as native-only, but this project keeps the list open so we can test third-party names directly in Live.

## Setup

```sh
npm install
npm run build
```

To run against Live:

```sh
npm start
```

Live beta needs Developer Mode enabled in `Preferences -> Extensions`. If the beta app is installed somewhere else, update `EXTENSION_HOST_PATH` in `.env`.
