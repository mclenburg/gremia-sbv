import { rmSync } from "node:fs";
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

export function resetDemoDataDirectory(dataDir = resolveDemoDataDirectory()): void {
  rmSync(dataDir, { recursive: true, force: true });
}

export async function prepareDemoVault(security: SecurityService): Promise<void> {
  const setup = await security.setupInitialPassword(DEMO_PASSWORD);
  if (!setup.ok) {
    throw new Error(setup.error ?? "Demo-Tresor konnte nicht initialisiert werden.");
  }
  seedDemoDatabase(security.getActiveDatabase());
  security.lock("demo-ready");
}
