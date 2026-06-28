# Repeat It

An Ableton Live extension for adding, removing, and organizing Ableton audio effects across selected tracks or all tracks.

<img src="https://i.imgur.com/LAVlVig.png" alt="Repeat It" width="406">

## Features

- Add Ableton audio effects and tools to selected tracks or every track in your project.
- Remove individual Ableton effects or remove all supported Ableton effects at once.
- Insert new devices at the **Start** or **End** of the device chain.
- Drag and drop effects to organize them in any order.
- Customize the **Common Effects/Tools** section with your favorite Ableton effect devices.
- Save your favorite effects and settings between Ableton sessions.

All included devices are native Ableton audio effects and tools.

> [!IMPORTANT]
> Third party VST support is planned, but is currently waiting on Ableton to expose it through the Extensions API.

## Settings

- Dark mode and tooltips are enabled by default.
- Choose your preferred interface theme in settings.
- Update checks run once per Ableton session and only notify you when a new version is available.

## Building

Install dependencies:

```sh

npm install

```

Build the extension:

```sh

npm run build

```

Run in development mode:

```sh

npm start

```

Create an installable `.ablx` package:

```sh

npm run package

```

Or download the latest compiled `.ablx` from [Releases](https://github.com/seathasky/Repeat-It/releases)
