import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { BackupOperationResult } from '../../../domain/models/backup.model';

type BackupService = NonNullable<Window['gremiaSbv']>['backup'];
type BackupRestoreActionDeps = {
  setBusy: (busy: boolean) => void;
  setResult: (result: BackupOperationResult | null) => void;
  setError: (error: string) => void;
};

export function createBackupRestoreActions({ setBusy, setResult, setError }: BackupRestoreActionDeps) {
  async function runOperation(passphrase: string, operation: (service: BackupService) => Promise<BackupOperationResult>, fallback: string) {
    setResult(null);
    setError('');
    if (passphrase.length < 12) {
      setError('Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.');
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup) throw new Error('Backup-Dienst ist nicht erreichbar.');
      const result = await operation(bridge.backup);
      if (!result.ok) setError(result.error ?? fallback);
      setResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return {
    createBackup: (passphrase: string) => runOperation(passphrase, (service) => service.create(passphrase), 'Backup konnte nicht erstellt werden.'),
    inspectBackup: (passphrase: string) => runOperation(passphrase, (service) => service.inspect(passphrase), 'Backup konnte nicht geprüft werden.'),
    restoreBackup: (passphrase: string, confirmation: string) => runOperation(passphrase, (service) => service.restore(passphrase, confirmation), 'Backup konnte nicht wiederhergestellt werden.'),
  };
}
