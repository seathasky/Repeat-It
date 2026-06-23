export const QUICK_DEVICE_NAMES = [
  "Utility",
  "EQ Eight",
  "Compressor",
  "Glue Compressor",
  "Limiter",
  "Saturator",
  "Auto Filter",
  "Delay",
  "Reverb",
] as const;

export const DROPDOWN_DEVICE_NAMES = [
  "Align Delay",
  "Amp",
  "Audio Effect Rack",
  "Auto Pan-Tremolo",
  "Auto Shift",
  "Beat Repeat",
  "Cabinet",
  "Channel EQ",
  "Chorus-Ensemble",
  "Corpus",
  "Drum Buss",
  "Dynamic Tube",
  "Echo",
  "EQ Three",
  "Erosion",
  "Envelope Follower",
  "External Audio Effect",
  "Filter Delay",
  "Gate",
  "Grain Delay",
  "Hybrid Reverb",
  "LFO",
  "Looper",
  "Multiband Dynamics",
  "Overdrive",
  "Pedal",
  "Phaser-Flanger",
  "Redux",
  "Resonators",
  "Roar",
  "Shaper",
  "Shifter",
  "Spectral Resonator",
  "Spectral Time",
  "Spectrum",
  "Tuner",
  "Vocoder",
] as const;

export const DEVICE_NAMES = [...QUICK_DEVICE_NAMES, ...DROPDOWN_DEVICE_NAMES] as const;

export const DEFAULT_COMMON_DEVICE_SLOTS = [
  ...QUICK_DEVICE_NAMES.slice(0, 8),
  null,
  null,
  null,
] as const;

export type DeviceName = (typeof DEVICE_NAMES)[number];

export const MAX_FOR_LIVE_DEVICE_PATHS: Partial<Record<string, readonly string[]>> = {
  "Align Delay": [
    "/Applications/Ableton Live 12 Beta.app/Contents/App-Resources/Builtin/Devices/Audio Effects/Align Delay/Ableton Folder Info/Align Delay.amxd",
  ],
  "Envelope Follower": [
    "/Applications/Ableton Live 12 Beta.app/Contents/App-Resources/Builtin/Devices/Audio Effects/Envelope Follower/Ableton Folder Info/Envelope Follower.amxd",
  ],
  "LFO": [
    "/Applications/Ableton Live 12 Beta.app/Contents/App-Resources/Builtin/Devices/Audio Effects/LFO/Ableton Folder Info/LFO.amxd",
  ],
  "Shaper": [
    "/Applications/Ableton Live 12 Beta.app/Contents/App-Resources/Builtin/Devices/Audio Effects/Shaper/Ableton Folder Info/Shaper.amxd",
  ],
};
