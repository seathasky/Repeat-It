import type { DeviceParameter } from "@ableton-extensions/sdk";

import type { ConfigurableDevice } from "./types.js";

type ParameterValueKind = "direct" | "percent" | "db" | "frequency";

export async function setDeviceParameter(
  device: ConfigurableDevice,
  parameterNames: string[],
  value: number,
  valueKind: ParameterValueKind = "direct",
) {
  const parameter = await findDeviceParameter(device, parameterNames);

  if (!parameter) {
    console.warn(
      `Repeat It could not find ${parameterNames.join("/")} on ${device.name}. Available: ${
        describeDeviceParameters(device)
      }`,
    );
    return;
  }

  const normalizedValue = normalizeParameterValue(
    value,
    parameter.min,
    parameter.max,
    parameter.defaultValue,
    valueKind,
  );

  await parameter.setValue(normalizedValue);
}

export async function setDeviceParameterByItem(
  device: ConfigurableDevice,
  parameterNames: string[],
  itemNames: string[],
) {
  let targetParameter = await findDeviceParameter(device, parameterNames);
  let itemIndex = targetParameter ? findDeviceParameterItemIndex(targetParameter, itemNames) : -1;

  if (itemIndex === -1) {
    const fallbackParameter = await findDeviceParameterByItem(device, itemNames);
    if (fallbackParameter && fallbackParameter !== targetParameter) {
      targetParameter = fallbackParameter;
      itemIndex = findDeviceParameterItemIndex(targetParameter, itemNames);
    }
  }

  if (!targetParameter || itemIndex === -1) {
    console.warn(
      `Repeat It could not find ${itemNames.join("/")} in ${device.name} ${parameterNames.join("/")}. Available parameters: ${
        describeDeviceParameters(device)
      }`,
    );
    return;
  }

  const value = targetParameter.min + itemIndex;
  const normalizedValue = Math.min(Math.max(value, targetParameter.min), targetParameter.max);
  await targetParameter.setValue(normalizedValue);
}

async function findDeviceParameterByItem(
  device: ConfigurableDevice,
  itemNames: string[],
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parameters = device.parameters;
    const matchedParameter = parameters.find((parameter) =>
      findDeviceParameterItemIndex(parameter, itemNames) !== -1
    );

    if (matchedParameter || parameters.length > 0) {
      return matchedParameter ?? null;
    }

    await wait(50);
  }

  return null;
}

async function findDeviceParameter(
  device: ConfigurableDevice,
  parameterNames: string[],
) {
  const aliases = parameterNames.map(normalizeParameterName);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parameters = device.parameters;
    const matchedParameter =
      parameters.find((parameter) => aliases.includes(normalizeParameterName(parameter.name))) ??
      parameters.find((parameter) => {
        const parameterName = normalizeParameterName(parameter.name);
        return aliases.some((alias) =>
          parameterName.includes(alias) || alias.includes(parameterName)
        );
      }) ??
      null;

    if (matchedParameter || parameters.length > 0) {
      return matchedParameter;
    }

    await wait(50);
  }

  return null;
}

function normalizeParameterName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeParameterValue(
  value: number,
  min: number,
  max: number,
  defaultValue: number,
  valueKind: ParameterValueKind,
) {
  if (valueKind === "db") {
    return normalizeDbParameterValue(value, min, max, defaultValue);
  }

  if (valueKind === "frequency") {
    return normalizeFrequencyParameterValue(value, min, max);
  }

  const normalizedValue = valueKind === "percent" && max <= 4 && value > max
    ? value / 100
    : value;

  return Math.min(Math.max(normalizedValue, min), max);
}

function findDeviceParameterItemIndex(
  parameter: DeviceParameter<"1.0.0">,
  itemNames: string[],
) {
  const aliases = itemNames.map(normalizeParameterName);

  return parameter.valueItems.findIndex((item) => {
    const itemName = normalizeParameterName(item.name);
    const itemShortName = normalizeParameterName(item.shortName);

    return aliases.some((alias) =>
      alias === itemName ||
      alias === itemShortName
    );
  });
}

function describeDeviceParameters(device: ConfigurableDevice) {
  return device.parameters
    .map((parameter) => {
      const items = parameter.valueItems.length > 0
        ? ` [${parameter.valueItems.map((item) => item.name || item.shortName).join(", ")}]`
        : "";
      return `${parameter.name}${items}`;
    })
    .join(", ");
}

function normalizeDbParameterValue(value: number, min: number, max: number, defaultValue: number) {
  if (min <= value && value <= max && (min < -1 || max > 1)) {
    return value;
  }

  if (value === 0) {
    return defaultValue;
  }

  if (min >= 0 && max <= 1) {
    const halfRange = value > 0 ? max - defaultValue : defaultValue - min;
    return Math.min(Math.max(defaultValue + ((halfRange * value) / 36), min), max);
  }

  if (value > 0) {
    const positiveRange = max - defaultValue;
    return Math.min(defaultValue + (positiveRange * (value / 35)), max);
  }

  const negativeRange = defaultValue - min;
  return Math.max(defaultValue + (negativeRange * (value / 35)), min);
}

function normalizeFrequencyParameterValue(value: number, min: number, max: number) {
  if (min <= value && value <= max && max > 1000) {
    return value;
  }

  const minHz = 10;
  const maxHz = 22050;
  const ratio = Math.log(value / minHz) / Math.log(maxHz / minHz);
  const normalizedRatio = Math.min(Math.max(ratio, 0), 1);

  return min + ((max - min) * normalizedRatio);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
