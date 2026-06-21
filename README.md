# Repeat It

 An Ableton Live Extension for adding one effect to every track at once.

<img src="https://i.imgur.com/tkeCCfg.png" alt="Repeat It" width="406">

## What it does

- Right-click any audio or MIDI track.
- Choose `Repeat It: Add Utility to all tracks`, or one of the other configured devices.
- The extension inserts that device at the end of every regular track's device chain.

All Ableton FX devices included!

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

or Download the compiled ablx from releases.
