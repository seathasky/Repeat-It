import { configureDelayDevice, parseDelayDeviceConfig } from "./delay.js";
import { configureEqEightDevice, parseEqEightDeviceConfig } from "./eq-eight.js";
import { configureReverbDevice, parseReverbDeviceConfig } from "./reverb.js";
import { configureSaturatorDevice, parseSaturatorDeviceConfig } from "./saturator.js";
import { configureUtilityDevice, parseUtilityDeviceConfig } from "./utility.js";
import type { ConfigurableDevice, DeviceConfig } from "./types.js";

export type { DeviceConfig } from "./types.js";

export async function configureDevice(
  device: ConfigurableDevice,
  deviceName: string,
  deviceConfig: DeviceConfig | undefined,
) {
  if (deviceName === "Utility" && deviceConfig?.Utility) {
    await configureUtilityDevice(device, deviceConfig.Utility);
  } else if (deviceName === "EQ Eight" && deviceConfig?.["EQ Eight"]) {
    await configureEqEightDevice(device, deviceConfig["EQ Eight"]);
  } else if (deviceName === "Saturator" && deviceConfig?.Saturator) {
    await configureSaturatorDevice(device, deviceConfig.Saturator);
  } else if (deviceName === "Reverb" && deviceConfig?.Reverb) {
    await configureReverbDevice(device, deviceConfig.Reverb);
  } else if (deviceName === "Delay" && deviceConfig?.Delay) {
    await configureDelayDevice(device, deviceConfig.Delay);
  }
}

export function parseDeviceConfig(deviceName: string, value: unknown): DeviceConfig | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  if (deviceName === "Utility") {
    return parseUtilityDeviceConfig(value);
  }

  if (deviceName === "EQ Eight") {
    return parseEqEightDeviceConfig(value);
  }

  if (deviceName === "Saturator") {
    return parseSaturatorDeviceConfig(value);
  }

  if (deviceName === "Reverb") {
    return parseReverbDeviceConfig(value);
  }

  if (deviceName === "Delay") {
    return parseDelayDeviceConfig(value);
  }

  return undefined;
}
