    let latestReleaseUrl = RELEASES_URL;

    function openLatestRelease() {
      closeWithResult({
        action: "openUrl",
        url: latestReleaseUrl || RELEASES_URL,
      });
    }

    function normalizeVersion(version) {
      return String(version)
        .trim()
        .replace(/^v/i, "")
        .split(/[+-]/)[0]
        .split(".")
        .map((part) => Number.parseInt(part, 10) || 0);
    }

    function compareVersions(currentVersion, latestVersion) {
      const currentParts = normalizeVersion(currentVersion);
      const latestParts = normalizeVersion(latestVersion);
      const length = Math.max(currentParts.length, latestParts.length);

      for (let index = 0; index < length; index += 1) {
        const currentPart = currentParts[index] || 0;
        const latestPart = latestParts[index] || 0;

        if (latestPart > currentPart) return 1;
        if (latestPart < currentPart) return -1;
      }

      return 0;
    }

    async function checkForUpdates(options = {}) {
      const silent = options.silent === true;
      const status = document.getElementById("update-status");
      const button = document.getElementById("update-button");

      if (!UPDATE_CHECK_URL) {
        if (!silent) {
          status.textContent = "Update checks are not configured yet.";
        }
        return;
      }

      if (!silent) {
        status.textContent = "Checking...";
        status.className = "update-status";
        button.disabled = true;
      }

      try {
        const response = await fetch(UPDATE_CHECK_URL, {
          headers: { "Accept": "application/vnd.github+json" },
        });

        if (!response.ok) {
          throw new Error(`GitHub returned ${response.status}`);
        }

        const release = await response.json();
        const latestVersion = release.tag_name || release.name;

        if (!latestVersion) {
          throw new Error("No version was found in the latest release.");
        }

        const comparison = compareVersions(VERSION, latestVersion);

        if (comparison > 0) {
          latestReleaseUrl = release.html_url || RELEASES_URL;
          status.className = "update-status update-status-available";
          status.innerHTML = `Update available: ${latestVersion} <button class="status-link" type="button" onclick="openLatestRelease()">Open in browser</button>`;
          if (release.html_url) {
            latestReleaseUrl = release.html_url;
          }
        } else if (comparison < 0) {
          if (!silent) {
            status.className = "update-status";
            status.textContent = `Installed ${VERSION} is newer than GitHub ${latestVersion}.`;
          }
        } else {
          if (!silent) {
            status.className = "update-status";
            status.textContent = `You are up to date (${VERSION}).`;
          }
        }
      } catch (error) {
        if (!silent) {
          status.className = "update-status";
          status.textContent = "Could not check for updates.";
        }
        console.error("Repeat It update check failed.", error);
      } finally {
        if (!silent) {
          button.disabled = false;
        }
      }
    }
