import path from "node:path";

export interface RuntimeDataDirectoryInput {
  demoDataDirectory?: string;
  configuredDataDirectory?: string;
  portableExecutableDirectory?: string;
  packaged: boolean;
  userDataDirectory: string;
  workingDirectory: string;
}

function absoluteFrom(baseDirectory: string, candidate: string): string {
  return path.isAbsolute(candidate) ? path.normalize(candidate) : path.resolve(baseDirectory, candidate);
}

export function resolveRuntimeDataDirectory(input: RuntimeDataDirectoryInput): string {
  if (input.demoDataDirectory) {
    return absoluteFrom(input.workingDirectory, input.demoDataDirectory);
  }

  if (input.configuredDataDirectory) {
    return absoluteFrom(input.workingDirectory, input.configuredDataDirectory);
  }

  if (input.packaged && input.portableExecutableDirectory) {
    return path.join(path.resolve(input.portableExecutableDirectory), "Gremia.SBV-Daten");
  }

  if (input.packaged) {
    return path.join(path.resolve(input.userDataDirectory), "data");
  }

  return path.join(path.resolve(input.workingDirectory), "data");
}

export interface StartupSmokeInput {
  argv: readonly string[];
  markerPath?: string;
  dataDirectory: string;
  writeMarker: (markerPath: string, content: string) => void;
  quit: () => void;
}

export function completeStartupSmokeTest(input: StartupSmokeInput): void {
  if (!input.argv.includes("--startup-smoke-test")) return;
  if (!input.markerPath || !path.isAbsolute(input.markerPath)) {
    throw new Error("Startup-Smoke-Test benötigt einen absoluten Markerpfad.");
  }
  input.writeMarker(
    input.markerPath,
    `${JSON.stringify({ ok: true, dataDirectory: input.dataDirectory })}\n`,
  );
  setImmediate(input.quit);
}
