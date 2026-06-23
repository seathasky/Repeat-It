import { setDeviceParameter } from "./parameters.js";
import type { ConfigurableDevice, UtilityDeviceConfig } from "./types.js";

export async function configureUtilityDevice(
  device: ConfigurableDevice,
  config: UtilityDeviceConfig,
) {
  if (typeof config.gainDb === "number") {
    await setDeviceParameter(
      device,
      ["Output", "Gain", "Volume", "Level", "Utility Gain", "Output Gain", "Input Gain"],
      config.gainDb,
      "db",
    );
  }

  if (typeof config.widthPercent === "number") {
    await setDeviceParameter(device, ["Width"], config.widthPercent, "percent");
  }

  if (typeof config.mono === "boolean") {
    await setDeviceParameter(device, ["Mono"], config.mono ? 1 : 0);
  }

  if (typeof config.phaseInvertLeft === "boolean") {
    await setDeviceParameter(
      device,
      [
        "Phase Invert Left",
        "Phase Left",
        "Phase L",
        "Phz-L",
        "Phz L",
        "Invert Left",
        "Left Phase",
        "Left Invert",
        "Left Inv",
        "L Phase",
        "L Invert",
        "L Inv",
      ],
      config.phaseInvertLeft ? 1 : 0,
    );
  }

  if (typeof config.phaseInvertRight === "boolean") {
    await setDeviceParameter(
      device,
      [
        "Phase Invert Right",
        "Phase Right",
        "Phase R",
        "Phz-R",
        "Phz R",
        "Invert Right",
        "Right Phase",
        "Right Invert",
        "Right Inv",
        "R Phase",
        "R Invert",
        "R Inv",
      ],
      config.phaseInvertRight ? 1 : 0,
    );
  }
}

export function parseUtilityDeviceConfig(value: unknown) {
  const config = value as { Utility?: unknown };

  if (typeof config.Utility !== "object" || config.Utility === null) {
    return undefined;
  }

  const utility = config.Utility as Record<string, unknown>;
  const parsedUtilityConfig: UtilityDeviceConfig = {};
  const gainDb = parseNumberInRange(utility.gainDb, -35, 35);
  const widthPercent = parseNumberInRange(utility.widthPercent, 0, 400);

  if (typeof gainDb === "number") {
    parsedUtilityConfig.gainDb = gainDb;
  }

  if (typeof widthPercent === "number") {
    parsedUtilityConfig.widthPercent = widthPercent;
  }

  if (typeof utility.mono === "boolean") {
    parsedUtilityConfig.mono = utility.mono;
  }

  if (typeof utility.phaseInvertLeft === "boolean") {
    parsedUtilityConfig.phaseInvertLeft = utility.phaseInvertLeft;
  }

  if (typeof utility.phaseInvertRight === "boolean") {
    parsedUtilityConfig.phaseInvertRight = utility.phaseInvertRight;
  }

  return Object.keys(parsedUtilityConfig).length > 0
    ? { Utility: parsedUtilityConfig }
    : undefined;
}

function parseNumberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, min), max);
}
