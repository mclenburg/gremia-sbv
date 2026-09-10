import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = 'companion-app/android';

function readWorkspaceFile(path: string): string {
  return readFileSync(join(workspaceRoot, path), 'utf8');
}

describe('Android-Begleit-App Arbeitsbereich', () => {
  it('ist als eigenständiger Gradle-Workspace neben der Desktop-Anwendung angelegt', () => {
    for (const file of [
      'settings.gradle.kts',
      'build.gradle.kts',
      'gradle.properties',
      'gradle/libs.versions.toml',
      'app/build.gradle.kts',
      'app/src/main/AndroidManifest.xml',
      'app/src/main/java/de/gremia/sbv/companion/MainActivity.kt',
    ]) {
      expect(existsSync(join(workspaceRoot, file))).toBe(true);
    }
  });

  it('startet ohne Netzwerkberechtigung, Cloud-Backup oder Desktop-Abhängigkeiten', () => {
    const manifest = readWorkspaceFile('app/src/main/AndroidManifest.xml');
    const appBuild = readWorkspaceFile('app/build.gradle.kts');
    const strings = readWorkspaceFile('app/src/main/res/values/strings.xml');

    expect(manifest.includes('android.permission.INTERNET')).toBe(false);
    expect(manifest.includes('android:allowBackup="false"')).toBe(true);
    expect(appBuild.includes('de.gremia.sbv.companion')).toBe(true);
    expect(appBuild.includes('project(":')).toBe(false);
    expect(strings.includes('Gremia.SBV Begleit-App')).toBe(true);
  });
});
