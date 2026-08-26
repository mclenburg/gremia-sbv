import { writeFileSync } from "node:fs";
import type { App } from "electron";
import {
  isDemoMode,
  prepareDemoVault,
  resetDemoDataDirectory,
  resolveDemoDataDirectory,
} from "../services/demoMode.js";
import {
  completeStartupSmokeTest,
  resolveRuntimeDataDirectory,
} from "./runtimeDataDirectory.js";
import { OWNER_ONLY_FILE_MODE, restrictFileToOwnerSync } from "../services/secureFilePermissions.js";

export {
  isDemoMode,
  prepareDemoVault,
  resetDemoDataDirectory,
  resolveDemoDataDirectory,
};

export function resolveApplicationDataDirectory(app: App): string {
  return resolveRuntimeDataDirectory({
    demoDataDirectory: isDemoMode() ? resolveDemoDataDirectory() : undefined,
    configuredDataDirectory: process.env.GREMIA_SBV_DATA_DIR,
    portableExecutableDirectory: process.env.PORTABLE_EXECUTABLE_DIR,
    packaged: app.isPackaged,
    userDataDirectory: app.getPath("userData"),
    workingDirectory: process.cwd(),
  });
}

export function finishPackagedStartupSmoke(dataDirectory: string, app: App): void {
  completeStartupSmokeTest({
    argv: process.argv,
    markerPath: process.env.GREMIA_SBV_STARTUP_SMOKE_MARKER,
    dataDirectory,
    writeMarker: (markerPath, content) => {
      writeFileSync(markerPath, content, {
        encoding: "utf8",
        mode: OWNER_ONLY_FILE_MODE,
        flag: "wx",
      });
      restrictFileToOwnerSync(markerPath);
    },
    quit: () => app.quit(),
  });
}
