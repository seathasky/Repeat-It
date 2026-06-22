import {
  DataModelObject,
  Track,
  initialize,
  type ActivationContext,
  type ArrangementSelection,
  type ContextMenuScope,
  type Handle,
} from "@ableton-extensions/sdk";

import repeatItInterface from "./interface.html";

const API_VERSION = "1.0.0";
const OPEN_COMMAND_ID = "repeat-it.open";
declare const __REPEAT_IT_BUILD_VERSION__: string;
declare const __REPEAT_IT_LOGO_MARKUP__: string;
declare const process: {
  env?: Record<string, string | undefined>;
  platform: string;
};
declare function require(moduleName: "node:child_process"): {
  execFile: (file: string, args: string[], callback?: (error: unknown) => void) => void;
};
declare function require(moduleName: "node:fs"): {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options: { recursive: boolean }) => void;
  readFileSync: (path: string, encoding: "utf8") => string;
  writeFileSync: (path: string, data: string, encoding: "utf8") => void;
};
declare function require(moduleName: "node:path"): {
  dirname: (path: string) => string;
  join: (...paths: string[]) => string;
};
const EXTENSION_VERSION = __REPEAT_IT_BUILD_VERSION__;
const LOGO_MARKUP = __REPEAT_IT_LOGO_MARKUP__;
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
  "Spectrum",
  "Tuner",
  "Vocoder",
] as const;

const DEVICE_NAMES = [...QUICK_DEVICE_NAMES, ...DROPDOWN_DEVICE_NAMES] as const;
const DEFAULT_COMMON_DEVICE_SLOTS = [
  ...QUICK_DEVICE_NAMES.slice(0, 8),
  null,
  null,
  null,
] as const;

type DeviceName = (typeof DEVICE_NAMES)[number];
type InsertPosition = "start" | "end";
type TrackScope = "all" | "selected";
type UserOptions = {
  isDarkModeEnabled: boolean;
  areTooltipsEnabled: boolean;
  commonDeviceSlots: (DeviceName | null)[];
};
const MAX_FOR_LIVE_DEVICE_PATHS: Partial<Record<string, readonly string[]>> = {
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
type SongTrack = Context["application"]["song"]["tracks"][number];
type RepeatItSelection = {
  userOptions?: UserOptions | undefined;
} & ({
  action: "add" | "delete";
  deviceName: DeviceName;
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
} | {
  action: "openUrl";
  url: string;
} | {
  action: "removeAll";
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
} | {
  action: "close";
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
});

const DEFAULT_USER_OPTIONS: UserOptions = {
  isDarkModeEnabled: true,
  areTooltipsEnabled: true,
  commonDeviceSlots: [...DEFAULT_COMMON_DEVICE_SLOTS],
};
let lastInsertPosition: InsertPosition = "end";
let lastTrackScope: TrackScope = "all";
let hasRunSessionUpdateCheck = false;
let userOptions: UserOptions = { ...DEFAULT_USER_OPTIONS };

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
  userOptions = loadUserOptions(context);

  context.commands.registerCommand(OPEN_COMMAND_ID, (launchContext) => {
    void openRepeatIt(context, launchContext);
  });

  for (const scope of scopes) {
    registeredActions.push(
      context.ui.registerContextMenuAction(scope, "Open", OPEN_COMMAND_ID),
    );
  }

  await Promise.all(registeredActions);
  console.log(`Repeat It registered ${registeredActions.length} context-menu actions.`);
}

async function openRepeatIt(context: Context, launchContext: unknown) {
  let shouldStayOpen = true;
  let selectedDropdownDevice: DeviceName | null = null;
  let selectedInsertPosition: InsertPosition = lastInsertPosition;
  let selectedTrackScope: TrackScope = lastTrackScope;

  while (shouldStayOpen) {
    const selectedTrackCount = getSelectedTracks(context, launchContext).length;
    const shouldRunAutoUpdateCheck = !hasRunSessionUpdateCheck;
    hasRunSessionUpdateCheck = true;
    const selection = await showRepeatItDialog(
      context,
      selectedDropdownDevice,
      selectedInsertPosition,
      selectedTrackScope,
      selectedTrackCount,
      shouldRunAutoUpdateCheck,
    );

    if (!selection) {
      shouldStayOpen = false;
    } else if (selection.action === "close") {
      updateUserOptions(context, selection.userOptions);
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      shouldStayOpen = false;
    } else if (selection.action === "add") {
      updateUserOptions(context, selection.userOptions);
      selectedDropdownDevice = getDropdownDevice(selection.deviceName) ?? selectedDropdownDevice;
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await insertDeviceOnTracks(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope),
        selection.deviceName,
        selectedInsertPosition,
        selectedTrackScope,
      );
    } else if (selection.action === "openUrl") {
      updateUserOptions(context, selection.userOptions);
      await openExternalUrl(selection.url);
    } else if (selection.action === "removeAll") {
      updateUserOptions(context, selection.userOptions);
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await deleteAllAbletonFX(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope),
        selectedTrackScope,
      );
    } else {
      updateUserOptions(context, selection.userOptions);
      selectedDropdownDevice = getDropdownDevice(selection.deviceName) ?? selectedDropdownDevice;
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await deleteDeviceFromTracks(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope),
        selection.deviceName,
        selectedTrackScope,
      );
    }
  }
}

async function showRepeatItDialog(
  context: Context,
  selectedDropdownDevice: DeviceName | null,
  selectedInsertPosition: InsertPosition,
  selectedTrackScope: TrackScope,
  selectedTrackCount: number,
  shouldRunAutoUpdateCheck: boolean,
) {
  const modalHtml = repeatItInterface
    .replace("__REPEAT_IT_QUICK_DEVICE_NAMES__", JSON.stringify(QUICK_DEVICE_NAMES))
    .replace("__REPEAT_IT_DROPDOWN_DEVICE_NAMES__", JSON.stringify(DROPDOWN_DEVICE_NAMES))
    .replace("__REPEAT_IT_SELECTED_DROPDOWN_DEVICE__", JSON.stringify(selectedDropdownDevice))
    .replace("__REPEAT_IT_SELECTED_INSERT_POSITION__", JSON.stringify(selectedInsertPosition))
    .replace("__REPEAT_IT_SELECTED_TRACK_SCOPE__", JSON.stringify(selectedTrackScope))
    .replace("__REPEAT_IT_SELECTED_TRACK_COUNT__", JSON.stringify(selectedTrackCount))
    .replace("__REPEAT_IT_AUTO_UPDATE_CHECK__", JSON.stringify(shouldRunAutoUpdateCheck))
    .replace("__REPEAT_IT_USER_OPTIONS__", JSON.stringify(userOptions))
    .replace("__REPEAT_IT_LOGO_MARKUP__", LOGO_MARKUP)
    .replace("__REPEAT_IT_ACTIVE_DEVICE_NAMES__", JSON.stringify(getActiveDeviceNames(context)))
    .replace("__REPEAT_IT_VERSION__", JSON.stringify(EXTENSION_VERSION))
    .replace("__REPEAT_IT_UPDATE_CHECK_URL__", JSON.stringify(UPDATE_CHECK_URL))
    .replace("__REPEAT_IT_RELEASES_URL__", JSON.stringify(RELEASES_URL));
  const result = await context.ui.showModalDialog(
    `data:text/html,${encodeURIComponent(modalHtml)}`,
    560,
    490,
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

function getOptionsPaths(context: Context): string[] {
  const path = require("node:path");
  const paths: string[] = [];

  if (context.environment.storageDirectory) {
    paths.push(path.join(context.environment.storageDirectory, "options.json"));
  }

  const fallbackDirectory = getFallbackOptionsDirectory();

  if (fallbackDirectory) {
    paths.push(path.join(fallbackDirectory, "options.json"));
  }

  return [...new Set(paths)];
}

function getFallbackOptionsDirectory(): string | null {
  const path = require("node:path");
  const env = process.env ?? {};

  if (process.platform === "darwin" && env.HOME) {
    return path.join(env.HOME, "Library", "Application Support", "Repeat It");
  }

  if (process.platform === "win32" && env.APPDATA) {
    return path.join(env.APPDATA, "Repeat It");
  }

  if (env.XDG_CONFIG_HOME) {
    return path.join(env.XDG_CONFIG_HOME, "Repeat It");
  }

  if (env.HOME) {
    return path.join(env.HOME, ".config", "Repeat It");
  }

  return null;
}

function loadUserOptions(context: Context): UserOptions {
  const optionsPaths = getOptionsPaths(context);

  try {
    const fs = require("node:fs");

    for (const optionsPath of optionsPaths) {
      if (!fs.existsSync(optionsPath)) {
        continue;
      }

      const options = parseUserOptions(JSON.parse(fs.readFileSync(optionsPath, "utf8")));

      if (options) {
        return options;
      }
    }
  } catch (error) {
    console.error("Repeat It could not load options.", error);
  }

  return { ...DEFAULT_USER_OPTIONS };
}

function saveUserOptions(context: Context, options: UserOptions) {
  const optionsPaths = getOptionsPaths(context);
  const fs = require("node:fs");
  const path = require("node:path");

  for (const optionsPath of optionsPaths) {
    try {
      fs.mkdirSync(path.dirname(optionsPath), { recursive: true });
      fs.writeFileSync(optionsPath, JSON.stringify(options, null, 2), "utf8");
    } catch (error) {
      console.error(`Repeat It could not save options to ${optionsPath}.`, error);
    }
  }
}

function updateUserOptions(context: Context, options: UserOptions | undefined) {
  if (!options) {
    return;
  }

  userOptions = options;
  saveUserOptions(context, userOptions);
}

function parseUserOptions(value: unknown): UserOptions | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const options = value as {
    isDarkModeEnabled?: unknown;
    areTooltipsEnabled?: unknown;
    commonDeviceSlots?: unknown;
  };

  return {
    isDarkModeEnabled: typeof options.isDarkModeEnabled === "boolean"
      ? options.isDarkModeEnabled
      : DEFAULT_USER_OPTIONS.isDarkModeEnabled,
    areTooltipsEnabled: typeof options.areTooltipsEnabled === "boolean"
      ? options.areTooltipsEnabled
      : DEFAULT_USER_OPTIONS.areTooltipsEnabled,
    commonDeviceSlots: parseCommonDeviceSlots(options.commonDeviceSlots),
  };
}

function parseCommonDeviceSlots(value: unknown): (DeviceName | null)[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_USER_OPTIONS.commonDeviceSlots];
  }

  const slots = value
    .slice(0, 11)
    .map((deviceName) =>
      typeof deviceName === "string" && DEVICE_NAMES.includes(deviceName as DeviceName)
        ? deviceName as DeviceName
        : null,
    );

  while (slots.length < 11) {
    slots.push(null);
  }

  return slots;
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

function getTargetTracks(
  context: Context,
  launchContext: unknown,
  trackScope: TrackScope,
): SongTrack[] {
  if (trackScope === "all") {
    return context.application.song.tracks;
  }

  return getSelectedTracks(context, launchContext);
}

function getSelectedTracks(context: Context, launchContext: unknown): SongTrack[] {
  const tracks = context.application.song.tracks;
  const selectedTracks: SongTrack[] = [];

  function addTrack(track: SongTrack | null) {
    if (!track || !tracks.some((songTrack) => isSameObject(songTrack, track))) {
      return;
    }

    if (!selectedTracks.some((selectedTrack) => isSameObject(selectedTrack, track))) {
      selectedTracks.push(track);
    }
  }

  if (isHandle(launchContext)) {
    addTrack(getTrackFromHandle(context, launchContext));
  } else if (isArrangementSelection(launchContext)) {
    for (const laneHandle of launchContext.selected_lanes) {
      addTrack(getTrackFromHandle(context, laneHandle));
    }
  }

  return selectedTracks;
}

function getTrackFromHandle(context: Context, handle: Handle): SongTrack | null {
  try {
    let object: DataModelObject<typeof API_VERSION> | null = context.getObjectFromHandle(
      handle,
      DataModelObject,
    );

    while (object) {
      if (object instanceof Track) {
        return object;
      }

      object = object.parent;
    }
  } catch (error) {
    console.error("Repeat It could not resolve the selected track.", error);
  }

  return null;
}

function isSameObject(
  left: DataModelObject<typeof API_VERSION>,
  right: DataModelObject<typeof API_VERSION>,
) {
  return left.handle.id === right.handle.id;
}

function isHandle(value: unknown): value is Handle {
  return typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "bigint";
}

function isArrangementSelection(value: unknown): value is ArrangementSelection {
  return typeof value === "object" &&
    value !== null &&
    "selected_lanes" in value &&
    Array.isArray(value.selected_lanes);
}

function getTrackScopeLabel(trackScope: TrackScope, trackCount: number) {
  if (trackScope === "selected") {
    return trackCount === 1 ? "the selected track" : `${trackCount} selected tracks`;
  }

  return trackCount === 1 ? "the track" : "all tracks";
}

async function insertDeviceOnTracks(
  context: Context,
  tracks: SongTrack[],
  deviceName: string,
  insertPosition: InsertPosition,
  trackScope: TrackScope,
) {
  const positionLabel = insertPosition === "start" ? "at the start of" : "at the end of";
  const trackScopeLabel = getTrackScopeLabel(trackScope, tracks.length);

  if (tracks.length === 0) {
    console.warn(`Repeat It had no ${trackScope} track(s) to add ${deviceName} to.`);
    return;
  }

  await context.ui.withinProgressDialog(
    `Adding ${deviceName} ${positionLabel} ${trackScopeLabel}`,
    { progress: 0 },
    async (update, signal) => {
      let inserted = 0;
      const failures: string[] = [];

      for (const [index, track] of tracks.entries()) {
        signal.throwIfAborted();

        try {
          await insertDevice(track, deviceName, insertPosition);
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
  track: SongTrack,
  deviceName: string,
  insertPosition: InsertPosition,
) {
  const insertNames = [deviceName, ...(MAX_FOR_LIVE_DEVICE_PATHS[deviceName] ?? [])];
  let lastError: unknown = null;
  const insertIndex = insertPosition === "start" ? 0 : track.devices.length;

  for (const insertName of insertNames) {
    try {
      return await track.insertDevice(insertName, insertIndex);
    } catch (error) {
      lastError = error;
      console.error(`Repeat It could not add ${insertName} to ${track.name}.`, error);
    }
  }

  throw lastError;
}

async function deleteDeviceFromTracks(
  context: Context,
  tracks: SongTrack[],
  deviceName: DeviceName,
  trackScope: TrackScope,
) {
  const trackScopeLabel = getTrackScopeLabel(trackScope, tracks.length);

  if (tracks.length === 0) {
    console.warn(`Repeat It had no ${trackScope} track(s) to delete ${deviceName} from.`);
    return;
  }

  await context.ui.withinProgressDialog(
    `Deleting ${deviceName} from ${trackScopeLabel}`,
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

async function deleteAllAbletonFX(
  context: Context,
  tracks: SongTrack[],
  trackScope: TrackScope,
) {
  const trackScopeLabel = getTrackScopeLabel(trackScope, tracks.length);

  if (tracks.length === 0) {
    console.warn(`Repeat It had no ${trackScope} track(s) to delete Ableton FX from.`);
    return;
  }

  await context.ui.withinProgressDialog(
    `Deleting Ableton FX from ${trackScopeLabel}`,
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
      insertPosition?: unknown;
      trackScope?: unknown;
      userOptions?: unknown;
    };
    const parsedUserOptions = parseUserOptions(selection.userOptions) ?? undefined;

    if (selection.action === "openUrl") {
      if (typeof selection.url !== "string" || !selection.url.startsWith("https://github.com/")) {
        return null;
      }

      return {
        action: "openUrl",
        url: selection.url,
        userOptions: parsedUserOptions,
      };
    }

    if (selection.action === "removeAll") {
      return {
        action: "removeAll",
        insertPosition: parseInsertPosition(selection.insertPosition),
        trackScope: parseTrackScope(selection.trackScope),
        userOptions: parsedUserOptions,
      };
    }

    if (selection.action === "close") {
      return {
        action: "close",
        insertPosition: parseInsertPosition(selection.insertPosition),
        trackScope: parseTrackScope(selection.trackScope),
        userOptions: parsedUserOptions,
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
      insertPosition: parseInsertPosition(selection.insertPosition),
      trackScope: parseTrackScope(selection.trackScope),
      userOptions: parsedUserOptions,
    };
  } catch (error) {
    console.error("Repeat It could not read the selection.", error);
    return null;
  }
}

function parseTrackScope(trackScope: unknown): TrackScope {
  return trackScope === "selected" ? "selected" : "all";
}

function parseInsertPosition(insertPosition: unknown): InsertPosition {
  return insertPosition === "start" ? "start" : "end";
}
