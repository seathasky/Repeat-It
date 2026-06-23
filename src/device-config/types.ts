import type { Device } from "@ableton-extensions/sdk";

export type ConfigurableDevice = Device<"1.0.0">;

export type UtilityDeviceConfig = {
  gainDb?: number;
  widthPercent?: number;
  mono?: boolean;
  phaseInvertLeft?: boolean;
  phaseInvertRight?: boolean;
};

export type EqEightDeviceConfig = {
  cutLowEndHz?: number;
  cutHighEndHz?: number;
};

export type SaturatorDeviceConfig = {
  driveDb?: number;
  softClip?: boolean;
};

export type ReverbDeviceConfig = {
  dryWetPercent?: number;
  decayTimeSeconds?: number;
};

export type DelayDeviceConfig = {
  dryWetPercent?: number;
  leftTime?: string | number;
  rightTime?: string | number;
  linkTimes?: boolean;
};

export type DeviceConfig = {
  Utility?: UtilityDeviceConfig;
  "EQ Eight"?: EqEightDeviceConfig;
  Saturator?: SaturatorDeviceConfig;
  Reverb?: ReverbDeviceConfig;
  Delay?: DelayDeviceConfig;
};
