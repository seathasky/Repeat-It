    function openOptions() {
      isOptionsOpen = true;
      document.getElementById("options-panel").hidden = false;
    }

    function closeOptions() {
      isOptionsOpen = false;
      document.getElementById("options-panel").hidden = true;
    }

    function openDeviceConfig() {
      if (!isConfigurableDevice(selectedDevice)) {
        return;
      }

      isDeviceConfigOpen = true;
      syncDeviceConfigControls();
      document.getElementById("device-config-panel").hidden = false;
    }

    function closeDeviceConfig() {
      syncSelectedDeviceConfigFromControls();
      isDeviceConfigOpen = false;
      document.getElementById("device-config-panel").hidden = true;
    }

    let utilityConfig = {
      gainDb: 0,
      widthPercent: 100,
      mono: false,
      phaseInvertLeft: false,
      phaseInvertRight: false,
    };

    let eqEightConfig = {
      cutLowEndMode: "off",
      cutLowEndCustomHz: 95,
      cutHighEndMode: "off",
      cutHighEndCustomHz: 14500,
    };

    let saturatorConfig = {
      driveDb: 0,
      softClip: false,
    };

    function getDeviceConfig(deviceName) {
      syncSelectedDeviceConfigFromControls();

      if (deviceName === "Utility") {
        return {
          Utility: {
            gainDb: utilityConfig.gainDb,
            widthPercent: utilityConfig.widthPercent,
            mono: utilityConfig.mono,
            phaseInvertLeft: utilityConfig.phaseInvertLeft,
            phaseInvertRight: utilityConfig.phaseInvertRight,
          },
        };
      }

      if (deviceName === "EQ Eight") {
        const eqEight = {};

        if (eqEightConfig.cutLowEndMode !== "off") {
          eqEight.cutLowEndHz = eqEightConfig.cutLowEndMode === "custom"
            ? eqEightConfig.cutLowEndCustomHz
            : Number.parseInt(eqEightConfig.cutLowEndMode, 10);
        }

        if (eqEightConfig.cutHighEndMode !== "off") {
          eqEight.cutHighEndHz = eqEightConfig.cutHighEndMode === "custom"
            ? eqEightConfig.cutHighEndCustomHz
            : Number.parseInt(eqEightConfig.cutHighEndMode, 10);
        }

        return Object.keys(eqEight).length > 0
          ? { "EQ Eight": eqEight }
          : undefined;
      }

      if (deviceName === "Saturator") {
        return {
          Saturator: {
            driveDb: saturatorConfig.driveDb,
            softClip: saturatorConfig.softClip,
          },
        };
      }

      if (deviceName === "Reverb") {
        return {
          Reverb: {
            dryWetPercent: reverbConfig.dryWetPercent,
            decayTimeSeconds: reverbConfig.decayTimeSeconds,
          },
        };
      }

      if (deviceName === "Delay") {
        return {
          Delay: {
            dryWetPercent: delayConfig.dryWetPercent,
            leftTime: delayConfig.leftTime,
            rightTime: delayConfig.rightTime,
            linkTimes: delayConfig.linkTimes,
          },
        };
      }

      return undefined;
    }

    function getAddConfirmationCopy(deviceName) {
      const baseCopy = `This will add ${deviceName} to the ${selectedInsertPosition === "start" ? "start" : "end"} of ${getTrackScopeCopy()}.`;

      if (!isConfigurableDevice(deviceName)) {
        return baseCopy;
      }

      return `${baseCopy} Configure settings will be applied.`;
    }

    function isConfigurableDevice(deviceName) {
      return deviceName === "Utility" || deviceName === "EQ Eight" || deviceName === "Saturator" || deviceName === "Reverb" || deviceName === "Delay";
    }

    function syncSelectedDeviceConfigFromControls() {
      if (selectedDevice === "Utility") {
        syncUtilityConfigFromControls();
      } else if (selectedDevice === "EQ Eight") {
        syncEqEightConfigFromControls();
      } else if (selectedDevice === "Saturator") {
        syncSaturatorConfigFromControls();
      } else if (selectedDevice === "Reverb") {
        syncReverbConfigFromControls();
      } else if (selectedDevice === "Delay") {
        syncDelayConfigFromControls();
      }
    }

    function syncUtilityConfigFromControls() {
      const gainInput = document.getElementById("utility-gain");
      const widthInput = document.getElementById("utility-width");
      utilityConfig = {
        gainDb: clampNumber(Number.parseFloat(gainInput.value), -35, 35, 0),
        widthPercent: clampNumber(Number.parseFloat(widthInput.value), 0, 400, 100),
        mono: document.getElementById("utility-mono").checked,
        phaseInvertLeft: document.getElementById("utility-phase-left").checked,
        phaseInvertRight: document.getElementById("utility-phase-right").checked,
      };
      syncUtilityConfigControls();
    }

    function syncUtilityConfigControls() {
      document.getElementById("utility-gain").value = utilityConfig.gainDb.toFixed(1);
      document.getElementById("utility-width").value = String(Math.round(utilityConfig.widthPercent));
      document.getElementById("utility-mono").checked = utilityConfig.mono;
      document.getElementById("utility-phase-left").checked = utilityConfig.phaseInvertLeft;
      document.getElementById("utility-phase-right").checked = utilityConfig.phaseInvertRight;
    }

    function syncEqEightConfigFromControls() {
      eqEightConfig = {
        cutLowEndMode: document.getElementById("eq8-cut-low").value,
        cutLowEndCustomHz: clampNumber(
          Number.parseFloat(document.getElementById("eq8-cut-low-custom").value),
          10,
          1000,
          95,
        ),
        cutHighEndMode: document.getElementById("eq8-cut-high").value,
        cutHighEndCustomHz: clampNumber(
          Number.parseFloat(document.getElementById("eq8-cut-high-custom").value),
          1000,
          22050,
          14500,
        ),
      };
      syncEqEightConfigControls();
    }

    function syncEqEightConfigControls() {
      const isLowCustom = eqEightConfig.cutLowEndMode === "custom";
      const isHighCustom = eqEightConfig.cutHighEndMode === "custom";

      document.getElementById("eq8-cut-low").value = eqEightConfig.cutLowEndMode;
      document.getElementById("eq8-cut-low-custom").value = String(Math.round(eqEightConfig.cutLowEndCustomHz));
      document.getElementById("eq8-cut-low-custom").disabled = !isLowCustom;
      document.getElementById("eq8-cut-low-custom-field").classList.toggle("disabled", !isLowCustom);
      document.getElementById("eq8-cut-high").value = eqEightConfig.cutHighEndMode;
      document.getElementById("eq8-cut-high-custom").value = String(Math.round(eqEightConfig.cutHighEndCustomHz));
      document.getElementById("eq8-cut-high-custom").disabled = !isHighCustom;
      document.getElementById("eq8-cut-high-custom-field").classList.toggle("disabled", !isHighCustom);
    }

    let reverbConfig = {
      dryWetPercent: 15,
      decayTimeSeconds: 1.5,
    };

    let delayConfig = {
      dryWetPercent: 20,
      leftTime: "4",
      rightTime: "4",
      linkTimes: true,
    };

    function syncSaturatorConfigFromControls() {
      saturatorConfig = {
        driveDb: clampNumber(
          Number.parseFloat(document.getElementById("saturator-drive").value),
          0,
          36,
          0,
        ),
        softClip: document.getElementById("saturator-soft-clip").checked,
      };
      syncSaturatorConfigControls();
    }

    function syncSaturatorConfigControls() {
      document.getElementById("saturator-drive").value = saturatorConfig.driveDb.toFixed(1);
      document.getElementById("saturator-soft-clip").checked = saturatorConfig.softClip;
    }

    function syncReverbConfigFromControls() {
      reverbConfig = {
        dryWetPercent: clampNumber(
          Number.parseFloat(document.getElementById("reverb-dry-wet").value),
          0,
          100,
          15,
        ),
        decayTimeSeconds: clampNumber(
          Number.parseFloat(document.getElementById("reverb-decay-time").value),
          0,
          10,
          1.5,
        ),
      };
      syncReverbConfigControls();
    }

    function syncReverbConfigControls() {
      document.getElementById("reverb-dry-wet").value = String(Math.round(reverbConfig.dryWetPercent));
      document.getElementById("reverb-decay-time").value = reverbConfig.decayTimeSeconds.toFixed(1);
    }

    function syncDelayConfigFromControls() {
      delayConfig = {
        dryWetPercent: clampNumber(
          Number.parseFloat(document.getElementById("delay-dry-wet").value),
          0,
          100,
          20,
        ),
        leftTime: document.getElementById("delay-left-time").value || "4",
        rightTime: document.getElementById("delay-right-time").value || "4",
        linkTimes: document.getElementById("delay-link-times").checked,
      };

      if (delayConfig.linkTimes) {
        delayConfig.rightTime = delayConfig.leftTime;
      }

      syncDelayConfigControls();
    }

    function syncDelayConfigControls() {
      document.getElementById("delay-dry-wet").value = String(Math.round(delayConfig.dryWetPercent));
      document.getElementById("delay-left-time").value = delayConfig.leftTime;
      document.getElementById("delay-right-time").value = delayConfig.rightTime;
      document.getElementById("delay-link-times").checked = delayConfig.linkTimes;
      document.getElementById("delay-right-time").disabled = delayConfig.linkTimes;
    }

    function onDelayLeftTimeChange() {
      delayConfig.leftTime = document.getElementById("delay-left-time").value || "4";
      if (delayConfig.linkTimes) {
        delayConfig.rightTime = delayConfig.leftTime;
      }
      syncDelayConfigControls();
    }

    function onDelayRightTimeChange() {
      delayConfig.rightTime = document.getElementById("delay-right-time").value || "4";
      syncDelayConfigControls();
    }

    function onDelayLinkChange() {
      delayConfig.linkTimes = document.getElementById("delay-link-times").checked;
      if (delayConfig.linkTimes) {
        delayConfig.rightTime = delayConfig.leftTime;
      }
      syncDelayConfigControls();
    }

    function applyDelayPreset(presetName) {
      const presets = {
        "quarter-note": { dryWetPercent: 20, leftTime: "4", rightTime: "4", linkTimes: true },
        "eighth-note": { dryWetPercent: 18, leftTime: "2", rightTime: "2", linkTimes: true },
        "sixteenth-note": { dryWetPercent: 15, leftTime: "1", rightTime: "1", linkTimes: true },
        "ping-pong-wide": { dryWetPercent: 25, leftTime: "2", rightTime: "4", linkTimes: false },
        "wide-throw": { dryWetPercent: 25, leftTime: "4", rightTime: "8", linkTimes: false },
        "triplet-groove": { dryWetPercent: 20, leftTime: "3", rightTime: "6", linkTimes: false },
      };

      const preset = presets[presetName];
      if (!preset) {
        return;
      }

      delayConfig = {
        dryWetPercent: preset.dryWetPercent,
        leftTime: preset.leftTime,
        rightTime: preset.rightTime,
        linkTimes: preset.linkTimes,
      };
      syncDelayConfigControls();
    }

    function applyReverbPreset(presetName) {
      const presets = {
        "small-room": { dryWetPercent: 20, decayTimeSeconds: 0.8 },
        "medium-room": { dryWetPercent: 30, decayTimeSeconds: 1.5 },
        "large-hall": { dryWetPercent: 40, decayTimeSeconds: 3.2 },
        "plate-style": { dryWetPercent: 35, decayTimeSeconds: 2.0 },
      };

      const preset = presets[presetName];
      if (!preset) {
        return;
      }

      reverbConfig = {
        dryWetPercent: preset.dryWetPercent,
        decayTimeSeconds: preset.decayTimeSeconds,
      };

      syncReverbConfigControls();
    }

    function syncDeviceConfigControls() {
      document.getElementById("device-config-title").textContent = selectedDevice || "";
      document.getElementById("utility-config-fields").hidden = selectedDevice !== "Utility";
      document.getElementById("eq8-config-fields").hidden = selectedDevice !== "EQ Eight";
      document.getElementById("saturator-config-fields").hidden = selectedDevice !== "Saturator";
      document.getElementById("reverb-config-fields").hidden = selectedDevice !== "Reverb";
      document.getElementById("delay-config-fields").hidden = selectedDevice !== "Delay";

      if (selectedDevice === "Utility") {
        syncUtilityConfigControls();
      } else if (selectedDevice === "EQ Eight") {
        syncEqEightConfigControls();
      } else if (selectedDevice === "Saturator") {
        syncSaturatorConfigControls();
      } else if (selectedDevice === "Reverb") {
        syncReverbConfigControls();
      } else if (selectedDevice === "Delay") {
        syncDelayConfigControls();
      }
    }
