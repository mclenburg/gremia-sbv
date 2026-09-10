import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { MobileCompanionDevice, MobileCompanionSnapshotResult } from '../../../domain/models/mobile-companion.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

export const EMPTY_MOBILE_DEVICE_DRAFT = { label: '', recipientToken: '' };
export type MobileDeviceDraft = typeof EMPTY_MOBILE_DEVICE_DRAFT;

function currentThemeMode(): 'dark' | 'light' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function activeMobileDevices(devices: readonly MobileCompanionDevice[]): MobileCompanionDevice[] {
  return devices.filter((device) => device.status === 'active');
}

function mobileDeviceOptions(devices: readonly MobileCompanionDevice[]): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'Mobilgerät auswählen' },
    ...activeMobileDevices(devices).map((device) => ({ value: device.id, label: `${device.label} · ${device.instanceId}` })),
  ];
}

function nextSelectedDeviceId(current: string, devices: readonly MobileCompanionDevice[]): string {
  if (current && devices.some((device) => device.id === current && device.status === 'active')) return current;
  return activeMobileDevices(devices)[0]?.id ?? '';
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Begleit-App-Aktion konnte nicht ausgeführt werden.';
}

export function useMobileCompanionWorkflow(cases: CaseRecord[]) {
  const announce = useAnnouncer();
  const [devices, setDevices] = useState<MobileCompanionDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [deviceDraft, setDeviceDraft] = useState(EMPTY_MOBILE_DEVICE_DRAFT);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [snapshot, setSnapshot] = useState<MobileCompanionSnapshotResult | null>(null);
  const deviceOptions = useMemo(() => mobileDeviceOptions(devices), [devices]);

  function showError(cause: unknown) {
    const text = errorText(cause);
    setError(text);
    setMessage('');
    announce(text, 'assertive');
  }

  function showMessage(text: string) {
    setMessage(text);
    setError('');
    announce(text, 'polite');
  }

  async function reloadDevices() {
    const handover = await requireCaseHandoverBridge();
    const nextDevices = await handover.listMobileDevices();
    setDevices(nextDevices);
    setSelectedDeviceId((current) => nextSelectedDeviceId(current, nextDevices));
  }

  useEffect(() => { void reloadDevices().catch((cause) => showError(cause)); }, []);
  useEffect(() => { setCaseIds((current) => current.filter((id) => cases.some((record) => record.id === id))); }, [cases]);

  async function saveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSnapshot(null);
    try {
      const handover = await requireCaseHandoverBridge();
      const device = await handover.saveMobileDevice({
        label: deviceDraft.label,
        recipientToken: deviceDraft.recipientToken,
      });
      setDeviceDraft(EMPTY_MOBILE_DEVICE_DRAFT);
      await reloadDevices();
      setSelectedDeviceId(device.id);
      showMessage('Mobilgerät wurde gekoppelt.');
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function createSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeviceId) return showError(new Error('Bitte ein Mobilgerät auswählen.'));
    if (!caseIds.length) return showError(new Error('Bitte mindestens eine Fallakte auswählen.'));
    setBusy(true);
    setSnapshot(null);
    try {
      const handover = await requireCaseHandoverBridge();
      const created = await handover.createMobileSnapshot({ deviceId: selectedDeviceId, caseIds, uiThemeMode: currentThemeMode() });
      setSnapshot(created);
      await reloadDevices();
      showMessage('Mobile-Projektion wurde zielgebunden verschlüsselt erstellt.');
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function copyFirstFrame() {
    if (!snapshot?.qrFrames[0]) return;
    try {
      await navigator.clipboard.writeText(snapshot.qrFrames[0]);
      showMessage('Erster Mobile-Frame wurde in die Zwischenablage kopiert.');
    } catch {
      showError(new Error('Mobile-Frame konnte nicht kopiert werden. Bitte manuell markieren.'));
    }
  }

  async function disableDevice(id: string) {
    setBusy(true);
    try {
      const handover = await requireCaseHandoverBridge();
      await handover.setMobileDeviceStatus(id, 'disabled');
      await reloadDevices();
      showMessage('Mobilgerät wurde deaktiviert.');
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }

  return {
    devices,
    selectedDeviceId,
    deviceDraft,
    caseIds,
    busy,
    error,
    message,
    snapshot,
    deviceOptions,
    setDeviceDraft,
    setCaseIds,
    setSelectedDeviceId,
    saveDevice,
    createSnapshot,
    copyFirstFrame,
    disableDevice,
  };
}
