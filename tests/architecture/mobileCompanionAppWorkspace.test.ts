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
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileQrFrame.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileQrFrameParser.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileSnapshotFrameAssembler.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileSnapshotPayloadDecoder.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileWorkProjection.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileReturnDraft.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileReturnPayloadBuilder.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileReturnPackageCreator.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileDeadlineMonitor.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileDeadlineNotificationPlanner.kt',
      'app/src/main/java/de/gremia/sbv/companion/domain/security/MobileLockPolicy.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileSnapshotRepository.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileReturnDraftRepository.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileDeadlineNotificationScheduler.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileDeadlineNotificationReceiver.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/transfer/TargetBoundSnapshotDecryptor.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/transfer/TargetBoundReturnEncryptor.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/AppShellRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/GremiaUi.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/LockPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/MobileDateFormatter.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/PairingPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/SnapshotPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/ReturnPanelRenderer.kt',
    ]) {
      expect(existsSync(join(workspaceRoot, file))).toBe(true);
    }
  });

  it('startet ohne Netzwerkberechtigung, Cloud-Backup oder Desktop-Abhängigkeiten', () => {
    const manifest = readWorkspaceFile('app/src/main/AndroidManifest.xml');
    const appBuild = readWorkspaceFile('app/build.gradle.kts');

    expect(manifest.includes('android.permission.INTERNET')).toBe(false);
    expect(manifest.includes('android:allowBackup="false"')).toBe(true);
    expect(appBuild.includes('de.gremia.sbv.companion')).toBe(true);
    expect(appBuild.includes('androidx.activity:activity-ktx:1.9.3')).toBe(true);
    expect(appBuild.includes('androidx.core:core-ktx:1.13.1')).toBe(true);
    expect(appBuild.includes('com.journeyapps:zxing-android-embedded:4.3.0')).toBe(true);
    expect(appBuild.includes('project(":')).toBe(false);
  });

  it('nutzt nur lokal lizenzkompatible Android-Abhängigkeiten ohne Telemetrie-SDKs', () => {
    const appBuild = readWorkspaceFile('app/build.gradle.kts');
    const licenses = readWorkspaceFile('THIRD_PARTY_LICENSES.md');

    expect(appBuild.includes('org.bouncycastle:bcprov-jdk18on:1.85.2')).toBe(true);
    expect(appBuild.includes('firebase')).toBe(false);
    expect(appBuild.includes('play-services')).toBe(false);
    expect(licenses.includes('AGPL-3-kompatibel')).toBe(true);
  });

  it('deckt sicherheits- und transferrelevantes Verhalten mit Android-Unit-Tests statt Quelltext-Assertions ab', () => {
    for (const file of [
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileSnapshotFrameAssemblerTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileWorkProjectionBuilderTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileReturnPayloadBuilderTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileDeadlineMonitorTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileDeadlineNotificationPlannerTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileDashboardBuilderTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileSyncHistoryPolicyTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/security/MobileAppSettingsTest.kt',
      'app/src/test/java/de/gremia/sbv/companion/domain/security/MobileLockPolicyTest.kt',
    ]) {
      expect(existsSync(join(workspaceRoot, file))).toBe(true);
    }
  });

  it('sichert die geschützte Laufzeit-Hülle der Begleit-App strukturell ab', () => {
    const manifest = readWorkspaceFile('app/src/main/AndroidManifest.xml');

    expect(manifest.includes('android.permission.POST_NOTIFICATIONS')).toBe(true);
    expect(manifest.includes('MobileDeadlineNotificationReceiver')).toBe(true);
  });

  it('prüft den mobilen Rückgabe-Vertrag über Verhaltens-Tests', () => {
    expect(existsSync(join(
      workspaceRoot,
      'app/src/test/java/de/gremia/sbv/companion/domain/mobile/MobileReturnPayloadBuilderTest.kt',
    ))).toBe(true);
  });

  it('stylt native UI-Elemente über die zentrale Gremia-UI-Schicht', () => {
    const uiShellFiles = [
      'app/src/main/java/de/gremia/sbv/companion/ui/AppShellRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/LockPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/PairingPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/SnapshotPanelRenderer.kt',
      'app/src/main/java/de/gremia/sbv/companion/ui/ReturnPanelRenderer.kt',
    ];

    for (const file of uiShellFiles) {
      const source = readWorkspaceFile(file);
      expect(source).not.toMatch(/\b(EditText|TextView|Button)\s*\(/);
      expect(source).not.toContain('setTextColor(');
      expect(source).not.toContain('setHintTextColor(');
      expect(source).not.toContain('textSize =');
      expect(source).not.toContain('background =');
    }

    const ui = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/ui/GremiaUi.kt');
    expect(ui).toContain('fun textInput(');
    expect(ui).toContain('fun listItem(');
    expect(ui).toContain('fun button(');
    expect(ui).toContain('R.color.gremia_accent');
  });
});
