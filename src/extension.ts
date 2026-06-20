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

// Add any native Live device or third-party plug-in names you want exposed here.
// Names must match the way Live's browser/extension host resolves the device.
const DEVICE_NAMES = [
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

type DeviceName = (typeof DEVICE_NAMES)[number];
type Context = ReturnType<typeof initialize>;
type RepeatItSelection = {
  action: "add" | "delete";
  deviceName: DeviceName;
} | {
  action: "openUrl";
  url: string;
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

  while (shouldStayOpen) {
    const selection = await showRepeatItDialog(context);

    if (!selection) {
      shouldStayOpen = false;
    } else if (selection.action === "add") {
      await insertDeviceOnEveryTrack(context, selection.deviceName);
    } else if (selection.action === "openUrl") {
      await openExternalUrl(selection.url);
    } else {
      await deleteDeviceFromEveryTrack(context, selection.deviceName);
    }
  }
}

async function showRepeatItDialog(context: Context) {
  const modalHtml = repeatItInterface
    .replace("__REPEAT_IT_DEVICE_NAMES__", JSON.stringify(DEVICE_NAMES))
    .replace("__REPEAT_IT_ACTIVE_DEVICE_NAMES__", JSON.stringify(getActiveDeviceNames(context)))
    .replace("__REPEAT_IT_VERSION__", JSON.stringify(EXTENSION_VERSION))
    .replace("__REPEAT_IT_UPDATE_CHECK_URL__", JSON.stringify(UPDATE_CHECK_URL))
    .replace("__REPEAT_IT_RELEASES_URL__", JSON.stringify(RELEASES_URL));
  const result = await context.ui.showModalDialog(
    `data:text/html,${encodeURIComponent(modalHtml)}`,
    420,
    560,
  );

  return parseSelection(result);
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
          await track.insertDevice(deviceName, track.devices.length);
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

function parseSelection(result: string): RepeatItSelection | null {
  try {
    const parsed = JSON.parse(result) as {
      action?: unknown;
      deviceName?: unknown;
      url?: unknown;
    };

    if (parsed.action === "openUrl") {
      if (typeof parsed.url !== "string" || !parsed.url.startsWith("https://github.com/")) {
        return null;
      }

      return {
        action: "openUrl",
        url: parsed.url,
      };
    }

    if (parsed.action !== "add" && parsed.action !== "delete") {
      return null;
    }

    if (
      typeof parsed.deviceName !== "string" ||
      !DEVICE_NAMES.includes(parsed.deviceName as DeviceName)
    ) {
      return null;
    }

    return {
      action: parsed.action,
      deviceName: parsed.deviceName as DeviceName,
    };
  } catch (error) {
    console.error("Repeat It could not read the selection.", error);
    return null;
  }
}
