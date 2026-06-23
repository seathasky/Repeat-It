import { setDeviceParameter, setDeviceParameterByItem } from "./parameters.js";
import type { ConfigurableDevice, DelayDeviceConfig } from "./types.js";

const DELAY_TIME_ITEM_ALIASES: Record<string, string[]> = {
  "1": ["1", "1/16", "16th", "Sixteenth"],
  "2": ["2", "1/8", "8th", "Eighth"],
  "3": ["3", "1/8T", "1/8 T", "8T", "Triplet"],
  "4": ["4", "1/4", "Quarter", "Quarter Note"],
  "5": ["5"],
  "6": ["6", "1/4T", "1/4 T", "Quarter Triplet"],
  "8": ["8", "1/2", "Half", "Half Note"],
  "16": ["16", "1/1", "Whole", "Whole Note"],
};

const DELAY_TIME_VALUES = new Set(Object.keys(DELAY_TIME_ITEM_ALIASES));
const DELAY_TIME_VALUE_ALIASES: Record<string, string> = {
  "1/1": "16",
  whole: "16",
  "1/2": "8",
  half: "8",
  "1/4": "4",
  quarter: "4",
  "1/8": "2",
  eighth: "2",
  "1/16": "1",
  sixteenth: "1",
  "1/8T": "3",
  "1/8t": "3",
  "8t": "3",
  "1/4T": "6",
  "1/4t": "6",
  "4t": "6",
};

const DELAY_TIME_PARAMETER_ALIASES = {
  left: [
    "L 16th",
    "L16th",
    "Left 16th",
    "Left 16",
  ],
  right: [
    "R 16th",
    "R16th",
    "Right 16th",
    "Right 16",
  ],
};

function getDelayTimeItemAliases(value: string | number) {
  const normalizedValue = String(value);
  return DELAY_TIME_ITEM_ALIASES[normalizedValue] ?? [normalizedValue];
}

export async function configureDelayDevice(
  device: ConfigurableDevice,
  config: DelayDeviceConfig,
) {
  if (typeof config.dryWetPercent === "number") {
    await setDeviceParameter(
      device,
      ["Dry/Wet", "Dry Wet", "DryWet", "Dry", "Wet"],
      config.dryWetPercent,
      "percent",
    );
  }

  const leftTimeItemAliases = config.leftTime ? getDelayTimeItemAliases(config.leftTime) : undefined;
  const rightTimeItemAliases = config.rightTime ? getDelayTimeItemAliases(config.rightTime) : undefined;

  if (config.linkTimes === false) {
    await setDeviceParameter(device, ["Link", "Link Times", "Time Link", "Sync Link"], 0);
  }

  if (leftTimeItemAliases) {
    await setDeviceParameterByItem(device, DELAY_TIME_PARAMETER_ALIASES.left, leftTimeItemAliases);
  }

  if (rightTimeItemAliases) {
    await setDeviceParameterByItem(device, DELAY_TIME_PARAMETER_ALIASES.right, rightTimeItemAliases);
  }

  if (config.linkTimes === true) {
    await setDeviceParameter(device, ["Link", "Link Times", "Time Link", "Sync Link"], 1);
  }
}

export function parseDelayDeviceConfig(value: unknown) {
  const config = value as { Delay?: unknown };

  if (typeof config.Delay !== "object" || config.Delay === null) {
    return undefined;
  }

  const delay = config.Delay as Record<string, unknown>;
  const parsedDelayConfig: DelayDeviceConfig = {};
  const dryWetPercent = parseNumberInRange(delay.dryWetPercent, 0, 100);
  const leftTime = parseDelayTime(delay.leftTime);
  const rightTime = parseDelayTime(delay.rightTime);

  if (typeof dryWetPercent === "number") {
    parsedDelayConfig.dryWetPercent = dryWetPercent;
  }

  if (typeof leftTime === "string") {
    parsedDelayConfig.leftTime = leftTime;
  }

  if (typeof rightTime === "string") {
    parsedDelayConfig.rightTime = rightTime;
  }

  if (typeof delay.linkTimes === "boolean") {
    parsedDelayConfig.linkTimes = delay.linkTimes;
  }

  return Object.keys(parsedDelayConfig).length > 0
    ? { Delay: parsedDelayConfig }
    : undefined;
}

function parseNumberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, min), max);
}

function parseDelayTime(value: unknown) {
  if (typeof value === "number") {
    const numericValue = String(value);
    return DELAY_TIME_VALUES.has(numericValue)
      ? numericValue
      : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (DELAY_TIME_VALUES.has(value)) {
    return value;
  }

  return DELAY_TIME_VALUE_ALIASES[value] ?? undefined;
}
