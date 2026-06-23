import { setDeviceParameter, setDeviceParameterByItem } from "./parameters.js";
import type { ConfigurableDevice, SaturatorDeviceConfig } from "./types.js";

export async function configureSaturatorDevice(
  device: ConfigurableDevice,
  config: SaturatorDeviceConfig,
) {
  if (typeof config.driveDb === "number") {
    await setDeviceParameter(
      device,
      ["Drive", "Drive Amount", "Input Drive", "Saturator Drive"],
      config.driveDb,
      "db",
    );
  }

  if (config.softClip === true) {
    await setDeviceParameterByItem(
      device,
      ["Post Clip Mode", "Post Clip", "Clip Mode"],
      ["Soft Clip", "Softclip", "Soft Clipping"],
    );
  }
}

export function parseSaturatorDeviceConfig(value: unknown) {
  const config = value as { Saturator?: unknown };

  if (typeof config.Saturator !== "object" || config.Saturator === null) {
    return undefined;
  }

  const saturator = config.Saturator as Record<string, unknown>;
  const parsedSaturatorConfig: SaturatorDeviceConfig = {};
  const driveDb = parseNumberInRange(saturator.driveDb, 0, 36);

  if (typeof driveDb === "number") {
    parsedSaturatorConfig.driveDb = driveDb;
  }

  if (typeof saturator.softClip === "boolean") {
    parsedSaturatorConfig.softClip = saturator.softClip;
  }

  return Object.keys(parsedSaturatorConfig).length > 0
    ? { Saturator: parsedSaturatorConfig }
    : undefined;
}

function parseNumberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, min), max);
}
