    const QUICK_DEVICES = __REPEAT_IT_QUICK_DEVICE_NAMES__;
    const DROPDOWN_DEVICES = __REPEAT_IT_DROPDOWN_DEVICE_NAMES__;
    const ALL_DEVICES = [...QUICK_DEVICES, ...DROPDOWN_DEVICES];
    const SELECTED_DROPDOWN_DEVICE = __REPEAT_IT_SELECTED_DROPDOWN_DEVICE__;
    const SELECTED_INSERT_POSITION = __REPEAT_IT_SELECTED_INSERT_POSITION__;
    const SELECTED_TRACK_SCOPE = __REPEAT_IT_SELECTED_TRACK_SCOPE__;
    const SELECTED_TRACK_COUNT = __REPEAT_IT_SELECTED_TRACK_COUNT__;
    const AUTO_UPDATE_CHECK = __REPEAT_IT_AUTO_UPDATE_CHECK__;
    const USER_OPTIONS = __REPEAT_IT_USER_OPTIONS__;
    const ACTIVE_DEVICES = new Set(__REPEAT_IT_ACTIVE_DEVICE_NAMES__);
    const VERSION = __REPEAT_IT_VERSION__;
    const UPDATE_CHECK_URL = __REPEAT_IT_UPDATE_CHECK_URL__;
    const RELEASES_URL = __REPEAT_IT_RELEASES_URL__;
    const CONFIGURABLE_DEVICES = new Set([
      "Utility",
      "EQ Eight",
      "Saturator",
      "Reverb",
      "Delay",
    ]);

    const isWebKitMessageHandlerAvailable = window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.live;
    const isWebView2 = window.chrome && window.chrome.webview;

    function sendMessage(message) {
      if (isWebKitMessageHandlerAvailable) {
        window.webkit.messageHandlers.live.postMessage(message);
      } else if (isWebView2) {
        window.chrome.webview.postMessage(message);
      }
    }

    function getUserOptions() {
      return {
        isDarkModeEnabled,
        areTooltipsEnabled,
        commonDeviceSlots,
      };
    }

    function closeWithResult(result) {
      sendMessage({
        method: "close_and_send",
        params: [JSON.stringify({ ...result, userOptions: getUserOptions() })],
      });
    }

    function closeRepeatIt() {
      closeWithResult({
        action: "close",
        insertPosition: selectedInsertPosition,
        trackScope: selectedTrackScope,
      });
    }

    function applyOptions() {
      document.body.classList.toggle("light-mode", !isDarkModeEnabled);
      document.body.classList.toggle("tooltips-enabled", areTooltipsEnabled);
    }

__REPEAT_IT_UPDATE_SCRIPT__
    let pendingAction = null;
    let isOptionsOpen = false;
    let isDeviceConfigOpen = false;
    let isDarkModeEnabled = USER_OPTIONS && USER_OPTIONS.isDarkModeEnabled === false
      ? false
      : true;
    let areTooltipsEnabled = USER_OPTIONS && USER_OPTIONS.areTooltipsEnabled === false
      ? false
      : true;
    let commonDeviceSlots = Array.isArray(USER_OPTIONS && USER_OPTIONS.commonDeviceSlots)
      ? USER_OPTIONS.commonDeviceSlots.slice(0, 11)
      : [...QUICK_DEVICES.slice(0, 8), null, null, null];
    while (commonDeviceSlots.length < 11) {
      commonDeviceSlots.push(null);
    }
    let selectedInsertPosition = SELECTED_INSERT_POSITION === "start" ? "start" : "end";
    let selectedTrackScope = SELECTED_TRACK_SCOPE === "selected" && SELECTED_TRACK_COUNT > 0
      ? "selected"
      : "all";
    let selectedDevice = ALL_DEVICES.includes(SELECTED_DROPDOWN_DEVICE)
      ? SELECTED_DROPDOWN_DEVICE
      : commonDeviceSlots.find((deviceName) => ALL_DEVICES.includes(deviceName)) || "";

    const UNSUPPORTED_DROPDOWN_DEVICES = new Set([
      "Align Delay",
      "Shaper",
      "LFO",
      "Envelope Follower",
    ]);

__REPEAT_IT_POPUP_SCRIPT__

    function confirmAction(action, deviceName) {
      pendingAction = {
        action,
        deviceName,
        deviceConfig: action === "add" ? getDeviceConfig(deviceName) : undefined,
        insertPosition: selectedInsertPosition,
        trackScope: selectedTrackScope,
      };

      document.getElementById("confirm-title").textContent = action === "add"
        ? `Add ${deviceName}?`
        : `Delete all ${deviceName}?`;
      document.getElementById("confirm-copy").textContent = action === "add"
        ? getAddConfirmationCopy(deviceName)
        : `This will delete every ${deviceName} from ${getTrackScopeCopy()}.`;
      document.getElementById("confirm-yes").textContent = action === "add"
        ? "Add to all"
        : "Delete all";
      document.getElementById("confirm-yes").className = action === "add"
        ? "confirm-button"
        : "confirm-button danger";
      document.getElementById("confirm-panel").hidden = false;
    }

    function confirmRemoveAllAbletonFX() {
      pendingAction = {
        action: "removeAll",
        confirmed: false,
        insertPosition: selectedInsertPosition,
        trackScope: selectedTrackScope,
      };
      document.getElementById("confirm-title").textContent = "REMOVE ALL ABLETON FX?";
      document.getElementById("confirm-copy").textContent =
        `This will delete every supported Ableton audio effect from ${getTrackScopeCopy()}.`;
      document.getElementById("confirm-yes").textContent = "Delete all";
      document.getElementById("confirm-yes").className = "confirm-button danger";
      document.getElementById("confirm-panel").hidden = false;
    }

    function confirmRemoveCommonDevice(slotIndex) {
      const deviceName = commonDeviceSlots[slotIndex];

      if (!deviceName) {
        return;
      }

      pendingAction = { action: "removeCommon", slotIndex, deviceName };
      document.getElementById("confirm-title").textContent = `Remove ${deviceName}?`;
      document.getElementById("confirm-copy").textContent =
        "This removes it from Common effects/tools. It will not delete anything from your Live Set.";
      document.getElementById("confirm-yes").textContent = "Remove";
      document.getElementById("confirm-yes").className = "confirm-button danger";
      document.getElementById("confirm-panel").hidden = false;
    }

    function confirmSelectedDevice(action) {
      if (selectedDevice) {
        confirmAction(action, selectedDevice);
      }
    }

    function selectDevice(deviceName) {
      if (deviceName) {
        selectedDevice = deviceName;
        syncSelectedDeviceControls();
      }
    }

    function clampNumber(value, min, max, fallback) {
      if (!Number.isFinite(value)) {
        return fallback;
      }

      return Math.min(Math.max(value, min), max);
    }

    function syncSelectedDeviceControls() {
      const selectedLabel = document.getElementById("selected-device-label");
      const addButton = document.getElementById("add-selected-button");
      const deleteButton = document.getElementById("delete-selected-button");
      const configureButton = document.getElementById("configure-selected-button");

      selectedLabel.textContent = selectedDevice || "";
      addButton.disabled = !selectedDevice;
      deleteButton.disabled = !selectedDevice;
      configureButton.hidden = !isConfigurableDevice(selectedDevice);
      configureButton.disabled = !isConfigurableDevice(selectedDevice);

      if (!isConfigurableDevice(selectedDevice) && isDeviceConfigOpen) {
        document.getElementById("device-config-panel").hidden = true;
        isDeviceConfigOpen = false;
      } else if (isDeviceConfigOpen) {
        syncDeviceConfigControls();
      }

      for (const button of document.querySelectorAll("[data-device-name]")) {
        const isSelected = button.dataset.deviceName === selectedDevice;
        const isInstalled = ACTIVE_DEVICES.has(button.dataset.deviceName);
        button.className = [
          "device-button",
          isSelected ? "selected" : "",
          isInstalled ? "installed" : "",
        ].filter(Boolean).join(" ");
        button.setAttribute("aria-pressed", String(isSelected));
      }

    }

    function renderCommonDeviceSlots() {
      const grid = document.getElementById("device-list");
      grid.replaceChildren();

      for (const [slotIndex, deviceName] of commonDeviceSlots.entries()) {
        const slot = document.createElement("div");
        slot.className = "common-slot";

        if (deviceName) {
          const button = document.createElement("button");
          button.className = "device-button";
          button.type = "button";
          button.dataset.deviceName = deviceName;
          if (CONFIGURABLE_DEVICES.has(deviceName)) {
            button.classList.add("configurable-device");
            button.setAttribute("data-tooltip", "Custom parameters available");
          }
          const label = document.createElement("span");
          label.className = "device-button-label";
          label.textContent = deviceName;
          button.appendChild(label);

          if (CONFIGURABLE_DEVICES.has(deviceName)) {
            const badge = document.createElement("span");
            badge.className = "device-configurable-badge";
            badge.textContent = "⚙";
            badge.setAttribute("aria-hidden", "true");
            button.appendChild(badge);
          }

          button.setAttribute("aria-pressed", "false");
          button.addEventListener("click", () => selectDevice(deviceName));

          const removeButton = document.createElement("button");
          removeButton.className = "common-remove-button";
          removeButton.type = "button";
          removeButton.textContent = "x";
          removeButton.setAttribute("aria-label", `Remove ${deviceName} from common effects`);
          removeButton.addEventListener("click", () => confirmRemoveCommonDevice(slotIndex));

          slot.append(button, removeButton);
        } else {
          const addButton = document.createElement("button");
          addButton.className = "device-button add-slot-button";
          addButton.type = "button";
          addButton.textContent = "+";
          addButton.setAttribute("aria-label", "Add common effect");
          addButton.addEventListener("click", () => showCommonDevicePicker(slotIndex));
          slot.appendChild(addButton);
        }

        grid.appendChild(slot);
      }

      syncSelectedDeviceControls();
    }

    function showCommonDevicePicker(slotIndex) {
      const grid = document.getElementById("device-list");
      const slot = grid.children[slotIndex];
      const usedDevices = new Set(commonDeviceSlots.filter(Boolean));
      const availableDevices = ALL_DEVICES.filter((deviceName) =>
        !usedDevices.has(deviceName) && !UNSUPPORTED_DROPDOWN_DEVICES.has(deviceName),
      );
      const picker = document.createElement("select");
      picker.className = "common-picker";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Pick effect";
      picker.appendChild(placeholder);

      for (const availableDevice of availableDevices) {
        const option = document.createElement("option");
        option.value = availableDevice;
        option.textContent = availableDevice;
        picker.appendChild(option);
      }

      picker.addEventListener("change", () => {
        if (!ALL_DEVICES.includes(picker.value)) {
          return;
        }

        commonDeviceSlots[slotIndex] = picker.value;
        selectedDevice = picker.value;
        renderCommonDeviceSlots();
      });

      slot.replaceChildren(picker);
      picker.focus();
    }

    function getTrackScopeCopy() {
      if (selectedTrackScope === "selected") {
        return SELECTED_TRACK_COUNT === 1 ? "the selected track" : "selected tracks";
      }

      return "every track";
    }

    function syncTrackScopeButtons() {
      for (const button of document.querySelectorAll("[data-track-scope]")) {
        const isActive = button.dataset.trackScope === selectedTrackScope;
        button.className = isActive ? "placement-button active" : "placement-button";
        button.setAttribute("aria-pressed", String(isActive));
      }

      const selectedScopeButton = document.querySelector("[data-track-scope='selected']");
      selectedScopeButton.disabled = SELECTED_TRACK_COUNT === 0;
      selectedScopeButton.title = SELECTED_TRACK_COUNT === 0
        ? "Open Repeat It from a track to use selected tracks"
        : "";
    }

    function cancelPendingAction() {
      pendingAction = null;
      document.getElementById("confirm-panel").hidden = true;
    }

    function showProcessingPopup() {
      document.getElementById("confirm-panel").hidden = true;
      document.getElementById("processing-panel").hidden = false;
    }

    function runPendingAction() {
      if (!pendingAction) {
        return;
      }

      if (pendingAction.action === "removeAll" && !pendingAction.confirmed) {
        pendingAction.confirmed = true;
        document.getElementById("confirm-title").textContent = "ARE YOU SURE?";
        document.getElementById("confirm-copy").textContent =
          `This action will remove every supported Ableton audio effect from ${getTrackScopeCopy()}. This cannot be undone.`;
        document.getElementById("confirm-yes").textContent = "Yes, delete all";
        return;
      }

      if (pendingAction.action === "removeCommon") {
        commonDeviceSlots[pendingAction.slotIndex] = null;
        if (selectedDevice === pendingAction.deviceName) {
          selectedDevice = commonDeviceSlots.find((deviceName) => ALL_DEVICES.includes(deviceName)) ||
            "";
        }
        renderCommonDeviceSlots();
        cancelPendingAction();
        return;
      }

      showProcessingPopup();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          closeWithResult(pendingAction);
        });
      });
    }


    document.addEventListener("DOMContentLoaded", () => {
      const insertPositionButtons = document.querySelectorAll("[data-insert-position]");
      const trackScopeButtons = document.querySelectorAll("[data-track-scope]");
      const darkModeToggle = document.getElementById("dark-mode-toggle");
      const tooltipsToggle = document.getElementById("tooltips-toggle");
      document.getElementById("version").textContent = `v${VERSION}`;
      darkModeToggle.checked = isDarkModeEnabled;
      tooltipsToggle.checked = areTooltipsEnabled;
      applyOptions();
      if (AUTO_UPDATE_CHECK) {
        void checkForUpdates({ silent: true });
      }

      function syncInsertPositionButtons() {
        for (const button of insertPositionButtons) {
          const isActive = button.dataset.insertPosition === selectedInsertPosition;
          button.className = isActive ? "placement-button active" : "placement-button";
          button.setAttribute("aria-pressed", String(isActive));
        }
      }

      syncInsertPositionButtons();
      syncTrackScopeButtons();
      renderCommonDeviceSlots();

      for (const button of trackScopeButtons) {
        button.addEventListener("click", () => {
          selectedTrackScope = button.dataset.trackScope === "selected" && SELECTED_TRACK_COUNT > 0
            ? "selected"
            : "all";
          syncTrackScopeButtons();
        });
      }

      for (const button of insertPositionButtons) {
        button.addEventListener("click", () => {
          selectedInsertPosition = button.dataset.insertPosition === "start" ? "start" : "end";
          syncInsertPositionButtons();
        });
      }

      darkModeToggle.addEventListener("change", () => {
        isDarkModeEnabled = darkModeToggle.checked;
        applyOptions();
      });

      tooltipsToggle.addEventListener("change", () => {
        areTooltipsEnabled = tooltipsToggle.checked;
        applyOptions();
      });

      for (const input of document.querySelectorAll("[data-utility-config]")) {
        input.addEventListener("change", syncUtilityConfigFromControls);
      }

      for (const input of document.querySelectorAll("[data-eq8-config]")) {
        input.addEventListener("change", syncEqEightConfigFromControls);
      }

      for (const input of document.querySelectorAll("[data-saturator-config]")) {
        input.addEventListener("change", syncSaturatorConfigFromControls);
      }

      syncUtilityConfigControls();
      syncEqEightConfigControls();
      syncSaturatorConfigControls();

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (pendingAction) {
            cancelPendingAction();
          } else if (isDeviceConfigOpen) {
            closeDeviceConfig();
          } else if (isOptionsOpen) {
            closeOptions();
          } else {
            closeRepeatIt();
          }
        }
      });
    });
