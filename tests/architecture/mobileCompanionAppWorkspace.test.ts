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
      'app/src/main/java/de/gremia/sbv/companion/domain/security/MobileLockPolicy.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileSnapshotRepository.kt',
      'app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileReturnDraftRepository.kt',
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
    const strings = readWorkspaceFile('app/src/main/res/values/strings.xml');

    expect(manifest.includes('android.permission.INTERNET')).toBe(false);
    expect(manifest.includes('android:allowBackup="false"')).toBe(true);
    expect(appBuild.includes('de.gremia.sbv.companion')).toBe(true);
    expect(appBuild.includes('androidx.activity:activity-ktx:1.9.3')).toBe(true);
    expect(appBuild.includes('androidx.core:core-ktx:1.13.1')).toBe(true);
    expect(appBuild.includes('com.journeyapps:zxing-android-embedded:4.3.0')).toBe(true);
    expect(appBuild.includes('project(":')).toBe(false);
    expect(strings.includes('Gremia.SBV Begleit-App')).toBe(true);
    expect(strings.includes('Snapshot empfangen')).toBe(true);
    expect(strings.includes('QR-Code scannen')).toBe(true);
    expect(strings.includes('Mobile Änderungen zurückgeben')).toBe(true);
    expect(strings.includes('Fallakten filtern')).toBe(true);
    expect(strings.includes('Begleit-App gesperrt')).toBe(true);
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

  it('nimmt Mobile-Snapshots nur zielgebunden, vollständig und geschützt entgegen', () => {
    const parser = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileQrFrameParser.kt');
    const assembler = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileSnapshotFrameAssembler.kt');
    const decryptor = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/data/transfer/TargetBoundSnapshotDecryptor.kt');
    const encryptor = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/data/transfer/TargetBoundReturnEncryptor.kt');
    const repository = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileSnapshotRepository.kt');
    const lockPolicy = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/security/MobileLockPolicy.kt');
    const activity = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/MainActivity.kt');

    expect(parser).toContain('gsbvmobile://v1/');
    expect(parser).toContain('chunkChecksum');
    expect(assembler).toContain('packageSha256');
    expect(decryptor).toContain('x25519-hkdf-sha256');
    expect(encryptor).toContain('gremia-sbv-mobile-return');
    expect(encryptor).toContain('x25519-hkdf-sha256');
    expect(decryptor).toContain('targetInstanceId');
    expect(repository).toContain('AndroidSecretBox("gremia_sbv_companion_snapshot_v1")');
    expect(lockPolicy).toContain('initialState()');
    expect(activity).toContain('FLAG_SECURE');
    expect(activity).toContain('createConfirmDeviceCredentialIntent');
  });

  it('gibt mobile Änderungen als vollständigen Rückgabe-Vertrag zurück', () => {
    const drafts = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileReturnDraft.kt');
    const builder = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/domain/mobile/MobileReturnPayloadBuilder.kt');
    const repository = readWorkspaceFile('app/src/main/java/de/gremia/sbv/companion/data/mobile/MobileReturnDraftRepository.kt');

    expect(drafts).toContain('MobileReturnDeadlineDraft');
    expect(drafts).toContain('MobileReturnDeadlineCompletionDraft');
    expect(builder).toContain('"create_note"');
    expect(builder).toContain('"create_deadline"');
    expect(builder).toContain('"complete_deadline"');
    expect(repository).toContain('fun addDeadline(');
    expect(repository).toContain('fun completeDeadline(');
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
