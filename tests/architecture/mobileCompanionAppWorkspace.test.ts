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
      'app/src/main/java/de/gremia/sbv/companion/data/security/AndroidSecretBox.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/transfer/TransferIdentityRepository.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/transfer/TransferIdentity.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/transfer/TransferIdentityPolicy.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/transfer/X25519IdentityFactory.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/AppShellRenderer.kt',
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

  it('stellt die Desktop-kompatible Empfängerkennung ohne Telemetrie-Abhängigkeit bereit', () => {
    const appBuild = readWorkspaceFile('app/build.gradle.kts');
    const policy = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/transfer/TransferIdentityPolicy.kt');
    const factory = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/transfer/X25519IdentityFactory.kt');
    const licenses = readWorkspaceFile('THIRD_PARTY_LICENSES.md');

    expect(policy.includes('"GSBV1"')).toBe(true);
    expect(policy.includes('"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"')).toBe(true);
    expect(factory.includes('"1.3.101.110"')).toBe(true);
    expect(appBuild.includes('org.bouncycastle:bcprov-jdk18on:1.85.2')).toBe(true);
    expect(appBuild.includes('firebase')).toBe(false);
    expect(licenses.includes('AGPL-3-kompatibel')).toBe(true);
  });
});
