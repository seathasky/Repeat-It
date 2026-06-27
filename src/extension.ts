import {
  DataModelObject,
  Track,
  initialize,
  type ActivationContext,
  type ArrangementSelection,
  type ContextMenuScope,
  type Handle,
} from "@ableton-extensions/sdk";

import {
  configureDevice,
  parseDeviceConfig,
  type DeviceConfig,
} from "./device-config/index.js";
import {
  DEFAULT_COMMON_DEVICE_SLOTS,
  DEVICE_NAMES,
  DROPDOWN_DEVICE_NAMES,
  MAX_FOR_LIVE_DEVICE_PATHS,
  QUICK_DEVICE_NAMES,
  type DeviceName,
} from "./devices.js";
import repeatItInterface from "./interface/index.js";

const API_VERSION = "1.0.0";
const OPEN_COMMAND_ID = "repeat-it.open";
declare const __REPEAT_IT_BUILD_VERSION__: string;
declare const __REPEAT_IT_LOGO_MARKUP__: string;
declare const __REPEAT_IT_AUTUMN_MARKUP__: string;
declare const __REPEAT_IT_HALLOWEEN_MARKUP__: string;
declare const __REPEAT_IT_RETRO_MARKUP__: string;
declare const __REPEAT_IT_SNOWFLAKE_MARKUP__: string;
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
const AUTUMN_MARKUP = __REPEAT_IT_AUTUMN_MARKUP__;
const HALLOWEEN_MARKUP = __REPEAT_IT_HALLOWEEN_MARKUP__;
const RETRO_MARKUP = __REPEAT_IT_RETRO_MARKUP__;
const SNOWFLAKE_MARKUP = __REPEAT_IT_SNOWFLAKE_MARKUP__;
const UPDATE_CHECK_URL = "https://api.github.com/repos/seathasky/Repeat-It/releases/latest";
const RELEASES_URL = "https://github.com/seathasky/Repeat-It/releases";

type InsertPosition = "start" | "end";
type TrackScope = "all" | "selected";
type UserOptions = {
  themeName: string;
  isDarkModeEnabled: boolean;
  areTooltipsEnabled: boolean;
  shouldSkipGroupTracks: boolean;
  commonDeviceSlots: (DeviceName | null)[];
};
type Context = ReturnType<typeof initialize>;
type SongTrack = Context["application"]["song"]["tracks"][number];
type RepeatItSelection = {
  userOptions?: UserOptions | undefined;
} & ({
  action: "add" | "delete";
  deviceName: DeviceName;
  deviceConfig?: DeviceConfig;
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
  shouldSkipGroupTracks?: boolean;
} | {
  action: "openUrl";
  url: string;
} | {
  action: "removeAll";
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
  shouldSkipGroupTracks?: boolean;
} | {
  action: "setAllFadersToUnity";
} | {
  action: "close";
  insertPosition?: InsertPosition;
  trackScope?: TrackScope;
  shouldSkipGroupTracks?: boolean;
});

const DEFAULT_USER_OPTIONS: UserOptions = {
  themeName: "dark",
  isDarkModeEnabled: true,
  areTooltipsEnabled: true,
  shouldSkipGroupTracks: false,
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
  let selectedDevice: DeviceName | null = null;
  let selectedInsertPosition: InsertPosition = lastInsertPosition;
  let selectedTrackScope: TrackScope = lastTrackScope;
  let shouldSkipGroupTracks = userOptions.shouldSkipGroupTracks;

  while (shouldStayOpen) {
    const selectedTrackCount = getSelectedTracks(context, launchContext).length;
    const shouldRunAutoUpdateCheck = !hasRunSessionUpdateCheck;
    hasRunSessionUpdateCheck = true;
    const selection = await showRepeatItDialog(
      context,
      selectedDevice,
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
      shouldSkipGroupTracks = selection.shouldSkipGroupTracks ?? shouldSkipGroupTracks;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      shouldStayOpen = false;
    } else if (selection.action === "add") {
      updateUserOptions(context, selection.userOptions);
      selectedDevice = selection.deviceName;
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      shouldSkipGroupTracks = selection.shouldSkipGroupTracks ?? shouldSkipGroupTracks;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await insertDeviceOnTracks(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope, shouldSkipGroupTracks),
        selection.deviceName,
        selectedInsertPosition,
        selectedTrackScope,
        selection.deviceConfig,
      );
    } else if (selection.action === "openUrl") {
      updateUserOptions(context, selection.userOptions);
      await openExternalUrl(selection.url);
    } else if (selection.action === "removeAll") {
      updateUserOptions(context, selection.userOptions);
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      shouldSkipGroupTracks = selection.shouldSkipGroupTracks ?? shouldSkipGroupTracks;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await deleteAllAbletonFX(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope, shouldSkipGroupTracks),
        selectedTrackScope,
      );
    } else if (selection.action === "setAllFadersToUnity") {
      updateUserOptions(context, selection.userOptions);
      await setAllTrackFadersToUnity(context, getAllMixerTracks(context));
    } else {
      updateUserOptions(context, selection.userOptions);
      selectedDevice = selection.deviceName;
      selectedInsertPosition = selection.insertPosition ?? selectedInsertPosition;
      selectedTrackScope = selection.trackScope ?? selectedTrackScope;
      shouldSkipGroupTracks = selection.shouldSkipGroupTracks ?? shouldSkipGroupTracks;
      lastInsertPosition = selectedInsertPosition;
      lastTrackScope = selectedTrackScope;
      await deleteDeviceFromTracks(
        context,
        getTargetTracks(context, launchContext, selectedTrackScope, shouldSkipGroupTracks),
        selection.deviceName,
        selectedTrackScope,
      );
    }
  }
}

async function showRepeatItDialog(
  context: Context,
  selectedDevice: DeviceName | null,
  selectedInsertPosition: InsertPosition,
  selectedTrackScope: TrackScope,
  selectedTrackCount: number,
  shouldRunAutoUpdateCheck: boolean,
) {
  const modalHtml = repeatItInterface
    .replace("__REPEAT_IT_QUICK_DEVICE_NAMES__", JSON.stringify(QUICK_DEVICE_NAMES))
    .replace("__REPEAT_IT_DROPDOWN_DEVICE_NAMES__", JSON.stringify(DROPDOWN_DEVICE_NAMES))
    .replace("__REPEAT_IT_SELECTED_DROPDOWN_DEVICE__", JSON.stringify(selectedDevice))
    .replace("__REPEAT_IT_SELECTED_INSERT_POSITION__", JSON.stringify(selectedInsertPosition))
    .replace("__REPEAT_IT_SELECTED_TRACK_SCOPE__", JSON.stringify(selectedTrackScope))
    .replace("__REPEAT_IT_SELECTED_TRACK_COUNT__", JSON.stringify(selectedTrackCount))
    .replace("__REPEAT_IT_AUTO_UPDATE_CHECK__", JSON.stringify(shouldRunAutoUpdateCheck))
    .replace("__REPEAT_IT_USER_OPTIONS__", JSON.stringify(userOptions))
    .replace("__REPEAT_IT_LOGO_MARKUP__", LOGO_MARKUP)
    .replace("__REPEAT_IT_AUTUMN_MARKUP__", AUTUMN_MARKUP)
    .replace("__REPEAT_IT_HALLOWEEN_MARKUP__", HALLOWEEN_MARKUP)
    .replace("__REPEAT_IT_RETRO_MARKUP__", RETRO_MARKUP)
    .replace("__REPEAT_IT_SNOWFLAKE_MARKUP__", SNOWFLAKE_MARKUP)
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
    themeName?: unknown;
    isDarkModeEnabled?: unknown;
    areTooltipsEnabled?: unknown;
    shouldSkipGroupTracks?: unknown;
    commonDeviceSlots?: unknown;
  };
  const migratedThemeName = typeof options.themeName === "string"
    ? parseThemeName(options.themeName)
    : typeof options.isDarkModeEnabled === "boolean" && !options.isDarkModeEnabled
      ? "light"
      : DEFAULT_USER_OPTIONS.themeName;

  return {
    themeName: migratedThemeName,
    isDarkModeEnabled: typeof options.isDarkModeEnabled === "boolean"
      ? options.isDarkModeEnabled
      : migratedThemeName !== "light",
    areTooltipsEnabled: typeof options.areTooltipsEnabled === "boolean"
      ? options.areTooltipsEnabled
      : DEFAULT_USER_OPTIONS.areTooltipsEnabled,
    shouldSkipGroupTracks: typeof options.shouldSkipGroupTracks === "boolean"
      ? options.shouldSkipGroupTracks
      : DEFAULT_USER_OPTIONS.shouldSkipGroupTracks,
    commonDeviceSlots: parseCommonDeviceSlots(options.commonDeviceSlots),
  };
}

function parseThemeName(value: string): string {
  return ["dark", "light", "ocean", "moss", "sunset", "retro-neon", "autumn", "winter", "halloween"].includes(value)
    ? value
    : DEFAULT_USER_OPTIONS.themeName;
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
  shouldSkipGroupTracks: boolean,
): SongTrack[] {
  const allTracks = context.application.song.tracks;
  const targetTracks = trackScope === "all"
    ? allTracks
    : getSelectedTracks(context, launchContext);

  if (!shouldSkipGroupTracks) {
    return targetTracks;
  }

  return targetTracks.filter((track) => !isGroupTrack(track, allTracks));
}

function getAllMixerTracks(context: Context): SongTrack[] {
  const allMixerTracks = [
    ...context.application.song.tracks,
    ...context.application.song.returnTracks,
    context.application.song.mainTrack,
  ];
  const uniqueTracks: SongTrack[] = [];

  for (const track of allMixerTracks) {
    if (!uniqueTracks.some((uniqueTrack) => isSameObject(uniqueTrack, track))) {
      uniqueTracks.push(track);
    }
  }

  return uniqueTracks;
}

function isGroupTrack(track: SongTrack, tracks: SongTrack[]) {
  return tracks.some((candidate) => {
    const groupTrack = candidate.groupTrack;

    return groupTrack !== null && isSameObject(groupTrack, track);
  });
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
  deviceConfig: DeviceConfig | undefined,
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
          const device = await insertDevice(track, deviceName, insertPosition);
          await configureDevice(device, deviceName, deviceConfig);
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
  const insertIndexes = getInsertIndexes(track, insertPosition);

  for (const insertName of insertNames) {
    for (const insertIndex of insertIndexes) {
      try {
        return await track.insertDevice(insertName, insertIndex);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError;
}

function getInsertIndexes(track: SongTrack, insertPosition: InsertPosition) {
  if (insertPosition === "end") {
    return [track.devices.length];
  }

  const indexes = [0];

  if (track.devices.length > 0) {
    indexes.push(1, track.devices.length);
  }

  return [...new Set(indexes)];
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

async function setAllTrackFadersToUnity(context: Context, tracks: SongTrack[]) {
  if (tracks.length === 0) {
    console.warn("Repeat It had no track faders to set to unity.");
    return;
  }

  await context.ui.withinProgressDialog(
    "Setting all track faders to unity",
    { progress: 0 },
    async (update, signal) => {
      let updated = 0;
      const failures: string[] = [];

      for (const [index, track] of tracks.entries()) {
        signal.throwIfAborted();

        try {
          const volume = track.mixer.volume;
          await volume.setValue(volume.defaultValue);
          updated += 1;
        } catch (error) {
          failures.push(track.name);
          console.error(`Repeat It could not set ${track.name} fader to unity.`, error);
        }

        const progress = Math.round(((index + 1) / tracks.length) * 100);
        await update(`Set ${updated}/${tracks.length} faders to unity`, progress);
      }

      if (failures.length > 0) {
        console.warn(
          `Repeat It could not set ${failures.length} fader(s) to unity: ${failures.join(", ")}`,
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
      deviceConfig?: unknown;
      url?: unknown;
      insertPosition?: unknown;
      trackScope?: unknown;
      shouldSkipGroupTracks?: unknown;
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
        shouldSkipGroupTracks: parseShouldSkipGroupTracks(selection.shouldSkipGroupTracks),
        userOptions: parsedUserOptions,
      };
    }

    if (selection.action === "setAllFadersToUnity") {
      return {
        action: "setAllFadersToUnity",
        userOptions: parsedUserOptions,
      };
    }

    if (selection.action === "close") {
      return {
        action: "close",
        insertPosition: parseInsertPosition(selection.insertPosition),
        trackScope: parseTrackScope(selection.trackScope),
        shouldSkipGroupTracks: parseShouldSkipGroupTracks(selection.shouldSkipGroupTracks),
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

    const parsedDeviceConfig = selection.action === "add"
      ? parseDeviceConfig(selection.deviceName as DeviceName, selection.deviceConfig)
      : undefined;
    const parsedSelection: RepeatItSelection = {
      action: selection.action,
      deviceName: selection.deviceName as DeviceName,
      insertPosition: parseInsertPosition(selection.insertPosition),
      trackScope: parseTrackScope(selection.trackScope),
      shouldSkipGroupTracks: parseShouldSkipGroupTracks(selection.shouldSkipGroupTracks),
      userOptions: parsedUserOptions,
    };

    if (parsedDeviceConfig) {
      parsedSelection.deviceConfig = parsedDeviceConfig;
    }

    return parsedSelection;
  } catch (error) {
    console.error("Repeat It could not read the selection.", error);
    return null;
  }
}


function parseTrackScope(trackScope: unknown): TrackScope {
  return trackScope === "selected" ? "selected" : "all";
}

function parseShouldSkipGroupTracks(shouldSkipGroupTracks: unknown) {
  return shouldSkipGroupTracks === true;
}

function parseInsertPosition(insertPosition: unknown): InsertPosition {
  return insertPosition === "start" ? "start" : "end";
}
