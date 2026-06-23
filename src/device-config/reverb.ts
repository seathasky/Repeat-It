import { setDeviceParameter } from "./parameters.js";
import type { ConfigurableDevice, ReverbDeviceConfig } from "./types.js";

export async function configureReverbDevice(
  device: ConfigurableDevice,
  config: ReverbDeviceConfig,
) {
  if (typeof config.dryWetPercent === "number") {
    await setDeviceParameter(
      device,
      ["Dry/Wet", "Dry Wet", "DryWet", "Dry", "Wet"],
      config.dryWetPercent,
      "percent",
    );
  }

  if (typeof config.decayTimeSeconds === "number") {
    await setDeviceParameter(
      device,
      ["Decay Time", "Decay", "Time"],
      config.decayTimeSeconds,
    );
  }
}

export function parseReverbDeviceConfig(value: unknown) {
  const config = value as { Reverb?: unknown };

  if (typeof config.Reverb !== "object" || config.Reverb === null) {
    return undefined;
  }

  const reverb = config.Reverb as Record<string, unknown>;
  const parsedReverbConfig: ReverbDeviceConfig = {};
  const dryWetPercent = parseNumberInRange(reverb.dryWetPercent, 0, 100);
  const decayTimeSeconds = parseNumberInRange(reverb.decayTimeSeconds, 0, 10);

  if (typeof dryWetPercent === "number") {
    parsedReverbConfig.dryWetPercent = dryWetPercent;
  }

  if (typeof decayTimeSeconds === "number") {
    parsedReverbConfig.decayTimeSeconds = decayTimeSeconds;
  }

  return Object.keys(parsedReverbConfig).length > 0
    ? { Reverb: parsedReverbConfig }
    : undefined;
}

function parseNumberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, min), max);
}
