# Repeat It

An Ableton Live extension for adding or removing audio effects across selected tracks or all tracks.

<img src="https://i.imgur.com/LAVlVig.png" alt="Repeat It" width="406">

## What it does

- Right-click an audio or MIDI track and open Repeat It.
- Pick an Ableton effect/tool, choose `All tracks` or `Selected tracks`, then click `Add` or `Remove`.
- Insert new devices at the `Start` or `End` of the device chain.
- Customize the `Common effects/tools` slots with `+` and `x`.
- Use `Remove all Ableton FX` to clear supported Ableton FX from the current scope.

All included devices are Ableton audio effects/tools.

> [!IMPORTANT]
> Third-party VST support is planned, but we are waiting on Ableton to add it to the Ableton Extensions API.

## Options

- Dark mode and tooltips are enabled by default. You can change the GUI theme in settings to suit your style.
- Options and custom common slots are saved between Ableton restarts.
- Update checks run once per Ableton session and only show text when an update is available. 

## Setup

```sh
npm install
npm run build
```

To run against Live:

```sh
npm start
```

To build an installable `.ablx`:

```sh
npm run package
```

Or download the compiled `.ablx` from [Releases](https://github.com/seathasky/Repeat-It/releases).
