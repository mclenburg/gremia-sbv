import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { MobileCompanionDevice, MobileCompanionSnapshotResult } from '../../../domain/models/mobile-companion.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

import { useMobileDevicePairing } from './useMobileDevicePairing';
export { EMPTY_MOBILE_DEVICE_DRAFT, type MobileDeviceDraft } from './useMobileDevicePairing';

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
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [snapshot, setSnapshot] = useState<MobileCompanionSnapshotResult | null>(null);
  const deviceOptions = useMemo(() => mobileDeviceOptions(devices), [devices]);

  const showError = useCallback((cause: unknown) => {
    const text = errorText(cause);
    setError(text);
    setMessage('');
    announce(text, 'assertive');
  }, [announce]);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setError('');
    announce(text, 'polite');
  }, [announce]);

  const reloadDevices = useCallback(async () => {
    const handover = await requireCaseHandoverBridge();
    const nextDevices = await handover.listMobileDevices();
    setDevices(nextDevices);
    setSelectedDeviceId((current) => nextSelectedDeviceId(current, nextDevices));
  }, []);

  useEffect(() => { void reloadDevices().catch((cause) => showError(cause)); }, [reloadDevices, showError]);
  useEffect(() => { setCaseIds((current) => current.filter((id) => cases.some((record) => record.id === id))); }, [cases]);

  const pairing = useMobileDevicePairing({
    setBusy, clearSnapshot: () => setSnapshot(null), showMessage, showError,
    reloadDevices, selectDevice: setSelectedDeviceId,
  });

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

  async function copyFrame(frame: string) {
    if (!frame) return;
    try {
      await navigator.clipboard.writeText(frame);
      showMessage('Mobile-Frame wurde in die Zwischenablage kopiert.');
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
    ...pairing,
    caseIds,
    busy,
    error,
    message,
    snapshot,
    deviceOptions,
    setCaseIds,
    setSelectedDeviceId,
    createSnapshot,
    copyFrame,
    disableDevice,
  };
}
