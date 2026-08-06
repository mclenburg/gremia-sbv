import { existsSync, lstatSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SecurityService } from "./securityService.js";
import { seedDemoDatabase } from "./demoSeedService.js";

export const DEMO_PASSWORD = "gremia.sbv-demo";
const DEMO_DIR_NAME = "gremia-sbv-demo";

export function isDemoMode(argv = process.argv): boolean {
  return process.env.GREMIA_SBV_DEMO === "1" || argv.includes("--demo");
}

export function resolveDemoDataDirectory(): string {
  return path.join(os.tmpdir(), DEMO_DIR_NAME);
}

function assertSafeDemoDirectory(dataDir: string): void {
  const tempRoot = path.resolve(os.tmpdir());
  const resolved = path.resolve(dataDir);
  const relative = path.relative(tempRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Demo-Daten dürfen ausschließlich in einem Unterverzeichnis des temporären Systemverzeichnisses liegen.");
  }
  if (existsSync(resolved) && lstatSync(resolved).isSymbolicLink()) {
    throw new Error("Ein symbolischer Link darf nicht als Demo-Datenverzeichnis verwendet werden.");
  }
}

export function resetDemoDataDirectory(dataDir = resolveDemoDataDirectory()): void {
  assertSafeDemoDirectory(dataDir);
  rmSync(dataDir, { recursive: true, force: true });
}

export async function prepareDemoVault(security: SecurityService): Promise<void> {
  assertSafeDemoDirectory(security.getDataDirectory());
  const setup = await security.setupInitialPassword(DEMO_PASSWORD);
  if (!setup.ok) {
    security.lock("demo-initialization-failed");
    try { resetDemoDataDirectory(security.getDataDirectory()); } catch { /* ursprünglichen Initialisierungsfehler erhalten */ }
    throw new Error(setup.error ?? "Demo-Tresor konnte nicht initialisiert werden.");
  }
  try {
    seedDemoDatabase(security.getActiveDatabase());
  } catch (error) {
    security.lock("demo-initialization-failed");
    resetDemoDataDirectory(security.getDataDirectory());
    throw error;
  }
  security.lock("demo-ready");
}
