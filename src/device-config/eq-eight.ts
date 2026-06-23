import { setDeviceParameter, setDeviceParameterByItem } from "./parameters.js";
import type { ConfigurableDevice, EqEightDeviceConfig } from "./types.js";

export async function configureEqEightDevice(
  device: ConfigurableDevice,
  config: EqEightDeviceConfig,
) {
  if (typeof config.cutLowEndHz === "number") {
    await setDeviceParameter(
      device,
      ["1 Filter On A", "1 Filter On", "Band 1 On", "1 On", "Filter 1 On"],
      1,
    );
    await setDeviceParameterByItem(
      device,
      ["1 Filter Type A", "1 Filter Type", "Band 1 Filter Type", "Filter 1 Type", "1 Type"],
      ["Highpass", "High Pass", "HP"],
    );
    await setDeviceParameter(
      device,
      ["1 Frequency A", "1 Frequency", "Band 1 Frequency", "Filter 1 Frequency", "1 Freq"],
      config.cutLowEndHz,
      "frequency",
    );
  }

  if (typeof config.cutHighEndHz === "number") {
    await setDeviceParameter(
      device,
      ["8 Filter On A", "8 Filter On", "Band 8 On", "8 On", "Filter 8 On"],
      1,
    );
    await setDeviceParameterByItem(
      device,
      ["8 Filter Type A", "8 Filter Type", "Band 8 Filter Type", "Filter 8 Type", "8 Type"],
      ["Lowpass", "Low Pass", "LP"],
    );
    await setDeviceParameter(
      device,
      ["8 Frequency A", "8 Frequency", "Band 8 Frequency", "Filter 8 Frequency", "8 Freq"],
      config.cutHighEndHz,
      "frequency",
    );
  }
}

export function parseEqEightDeviceConfig(value: unknown) {
  const config = value as { "EQ Eight"?: unknown };

  if (typeof config["EQ Eight"] !== "object" || config["EQ Eight"] === null) {
    return undefined;
  }

  const eqEight = config["EQ Eight"] as Record<string, unknown>;
  const parsedEqEightConfig: EqEightDeviceConfig = {};
  const cutLowEndHz = parseNumberInRange(eqEight.cutLowEndHz, 10, 1000);
  const cutHighEndHz = parseNumberInRange(eqEight.cutHighEndHz, 1000, 22050);

  if (typeof cutLowEndHz === "number") {
    parsedEqEightConfig.cutLowEndHz = cutLowEndHz;
  }

  if (typeof cutHighEndHz === "number") {
    parsedEqEightConfig.cutHighEndHz = cutHighEndHz;
  }

  return Object.keys(parsedEqEightConfig).length > 0
    ? { "EQ Eight": parsedEqEightConfig }
    : undefined;
}

function parseNumberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, min), max);
}
