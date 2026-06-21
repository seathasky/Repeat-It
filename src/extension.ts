import {
  initialize,
  type ActivationContext,
  type ContextMenuScope,
} from "@ableton-extensions/sdk";

import repeatItInterface from "./interface.html";

const API_VERSION = "1.0.0";
const OPEN_COMMAND_ID = "repeat-it.open";
declare const __REPEAT_IT_BUILD_VERSION__: string;
declare const process: { platform: string };
declare function require(moduleName: string): {
  execFile: (file: string, args: string[], callback?: (error: unknown) => void) => void;
};
const EXTENSION_VERSION = __REPEAT_IT_BUILD_VERSION__;
const UPDATE_CHECK_URL = "https://api.github.com/repos/seathasky/Repeat-It/releases/latest";
const RELEASES_URL = "https://github.com/seathasky/Repeat-It/releases";

const QUICK_DEVICE_NAMES = [
  "Utility",
  "EQ Eight",
  "Compressor",
  "Glue Compressor",
  "Limiter",
  "Saturator",
  "Auto Filter",
  "Delay",
  "Reverb",
  "Spectrum",
] as const;

const DROPDOWN_DEVICE_NAMES = [
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
  "Tuner",
  "Vocoder",
] as const;

const DEVICE_NAMES = [...QUICK_DEVICE_NAMES, ...DROPDOWN_DEVICE_NAMES] as const;

type DeviceName = (typeof DEVICE_NAMES)[number];
const MAX_FOR_LIVE_DEVICE_PATHS: Partial<Record<DeviceName, readonly string[]>> = {
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
type Context = ReturnType<typeof initialize>;
type RepeatItSelection = {
  action: "add" | "delete";
  deviceName: DeviceName;
} | {
  action: "openUrl";
  url: string;
} | {
  action: "removeAll";
};

export async function activate(activation: ActivationContext) {
  const context = initialize(activation, API_VERSION);
  const scopes: ContextMenuScope<typeof API_VERSION>[] = [
    "AudioTrack",
    "MidiTrack",
    "AudioTrack.ArrangementSelection",
    "MidiTrack.ArrangementSelection",
  ];
  const registeredActions: Promise<() => Promise<void>>[] = [];

  console.log("Repeat It activated.");

  context.commands.registerCommand(OPEN_COMMAND_ID, () => {
    void openRepeatIt(context);
  });

  for (const scope of scopes) {
    registeredActions.push(
      context.ui.registerContextMenuAction(scope, "Open", OPEN_COMMAND_ID),
    );
  }

  await Promise.all(registeredActions);
  console.log(`Repeat It registered ${registeredActions.length} context-menu actions.`);
}

async function openRepeatIt(context: Context) {
  let shouldStayOpen = true;
  let selectedDropdownDevice: DeviceName | null = null;

  while (shouldStayOpen) {
    const selection = await showRepeatItDialog(context, selectedDropdownDevice);

    if (!selection) {
      shouldStayOpen = false;
    } else if (selection.action === "add") {
      selectedDropdownDevice = getDropdownDevice(selection.deviceName) ?? selectedDropdownDevice;
      await insertDeviceOnEveryTrack(context, selection.deviceName);
    } else if (selection.action === "openUrl") {
      await openExternalUrl(selection.url);
    } else if (selection.action === "removeAll") {
      await deleteAllAbletonFX(context);
    } else {
      selectedDropdownDevice = getDropdownDevice(selection.deviceName) ?? selectedDropdownDevice;
      await deleteDeviceFromEveryTrack(context, selection.deviceName);
    }
  }
}

async function showRepeatItDialog(context: Context, selectedDropdownDevice: DeviceName | null) {
  const modalHtml = repeatItInterface
    .replace("__REPEAT_IT_QUICK_DEVICE_NAMES__", JSON.stringify(QUICK_DEVICE_NAMES))
    .replace("__REPEAT_IT_DROPDOWN_DEVICE_NAMES__", JSON.stringify(DROPDOWN_DEVICE_NAMES))
    .replace("__REPEAT_IT_SELECTED_DROPDOWN_DEVICE__", JSON.stringify(selectedDropdownDevice))
    .replace("__REPEAT_IT_ACTIVE_DEVICE_NAMES__", JSON.stringify(getActiveDeviceNames(context)))
    .replace("__REPEAT_IT_VERSION__", JSON.stringify(EXTENSION_VERSION))
    .replace("__REPEAT_IT_UPDATE_CHECK_URL__", JSON.stringify(UPDATE_CHECK_URL))
    .replace("__REPEAT_IT_RELEASES_URL__", JSON.stringify(RELEASES_URL));
  const result = await context.ui.showModalDialog(
    `data:text/html,${encodeURIComponent(modalHtml)}`,
    420,
    620,
  );

  return parseSelection(result);
}

async function openExternalUrl(url: string) {
  const { execFile } = require("node:child_process");
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  await new Promise<void>((resolve, reject) => {
    execFile(command, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function getDropdownDevice(deviceName: DeviceName): DeviceName | null {
  return DROPDOWN_DEVICE_NAMES.includes(deviceName as (typeof DROPDOWN_DEVICE_NAMES)[number])
    ? deviceName
    : null;
}

function getActiveDeviceNames(context: Context): DeviceName[] {
  const tracks = context.application.song.tracks;

  if (tracks.length === 0) {
    return [];
  }

  return DEVICE_NAMES.filter((deviceName) =>
    tracks.every((track) => track.devices.some((device) => device.name === deviceName)),
  );
}

async function insertDeviceOnEveryTrack(context: Context, deviceName: DeviceName) {
  const tracks = context.application.song.tracks;

  await context.ui.withinProgressDialog(
    `Adding ${deviceName} to all tracks`,
    { progress: 0 },
    async (update, signal) => {
      let inserted = 0;
      const failures: string[] = [];

      for (const [index, track] of tracks.entries()) {
        signal.throwIfAborted();

        try {
          await insertDevice(track, deviceName);
          inserted += 1;
        } catch (error) {
          failures.push(track.name);
          console.error(`Repeat It could not add ${deviceName} to ${track.name}.`, error);
        }

        const progress = Math.round(((index + 1) / tracks.length) * 100);
        await update(`Added ${deviceName} to ${inserted}/${tracks.length} tracks`, progress);
      }

      if (failures.length > 0) {
        console.warn(
          `Repeat It skipped ${failures.length} track(s): ${failures.join(", ")}`,
        );
      }
    },
  );
}

async function insertDevice(
  track: Context["application"]["song"]["tracks"][number],
  deviceName: DeviceName,
) {
  const insertNames = [deviceName, ...(MAX_FOR_LIVE_DEVICE_PATHS[deviceName] ?? [])];
  let lastError: unknown = null;

  for (const insertName of insertNames) {
    try {
      return await track.insertDevice(insertName, track.devices.length);
    } catch (error) {
      lastError = error;
      console.error(`Repeat It could not add ${insertName} to ${track.name}.`, error);
    }
  }

  throw lastError;
}

async function deleteDeviceFromEveryTrack(context: Context, deviceName: DeviceName) {
  const tracks = context.application.song.tracks;

  await context.ui.withinProgressDialog(
    `Deleting ${deviceName} from all tracks`,
    { progress: 0 },
    async (update, signal) => {
      let deleted = 0;
      const failures: string[] = [];

      for (const [index, track] of tracks.entries()) {
        signal.throwIfAborted();

        try {
          const matchingDevices = track.devices.filter((device) => device.name === deviceName);

          for (const device of matchingDevices.reverse()) {
            await track.deleteDevice(device);
            deleted += 1;
          }
        } catch (error) {
          failures.push(track.name);
          console.error(`Repeat It could not delete ${deviceName} from ${track.name}.`, error);
        }

        const progress = Math.round(((index + 1) / tracks.length) * 100);
        await update(`Deleted ${deleted} ${deviceName} device(s)`, progress);
      }

      if (failures.length > 0) {
        console.warn(
          `Repeat It could not delete from ${failures.length} track(s): ${failures.join(", ")}`,
        );
      }
    },
  );
}

  async function deleteAllAbletonFX(context: Context) {
    const tracks = context.application.song.tracks;

    await context.ui.withinProgressDialog(
      "Deleting all Ableton FX",
      { progress: 0 },
      async (update, signal) => {
        let deleted = 0;
        const failures: string[] = [];

        for (const [index, track] of tracks.entries()) {
          signal.throwIfAborted();

          try {
            const matchingDevices = track.devices.filter((device) =>
              DEVICE_NAMES.includes(device.name as DeviceName),
            );

            for (const device of matchingDevices.reverse()) {
              await track.deleteDevice(device);
              deleted += 1;
            }
          } catch (error) {
            failures.push(track.name);
            console.error(`Repeat It could not delete Ableton FX from ${track.name}.`, error);
          }

          const progress = Math.round(((index + 1) / tracks.length) * 100);
          await update(`Deleted ${deleted} device(s)`, progress);
        }

        if (failures.length > 0) {
          console.warn(
            `Repeat It could not delete from ${failures.length} track(s): ${failures.join(", ")}`,
          );
        }
      },
    );
  }

  function parseSelection(result: unknown): RepeatItSelection | null {
    try {
      const parsed = typeof result === "string"
        ? JSON.parse(result)
        : result;

      if (typeof parsed !== "object" || parsed === null) {
        return null;
      }

      const selection = parsed as {
        action?: unknown;
        deviceName?: unknown;
        url?: unknown;
      };

      if (selection.action === "openUrl") {
        if (typeof selection.url !== "string" || !selection.url.startsWith("https://github.com/")) {
          return null;
        }

        return {
          action: "openUrl",
          url: selection.url,
        };
      }

      if (selection.action === "removeAll") {
        return {
          action: "removeAll",
        };
      }

      if (selection.action !== "add" && selection.action !== "delete") {
        return null;
      }

      if (
        typeof selection.deviceName !== "string" ||
        !DEVICE_NAMES.includes(selection.deviceName as DeviceName)
      ) {
        return null;
      }

      return {
        action: selection.action,
        deviceName: selection.deviceName as DeviceName,
      };
    } catch (error) {
      console.error("Repeat It could not read the selection.", error);
      return null;
    }
  }
