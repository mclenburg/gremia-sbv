import { useState, type FormEvent } from 'react';
import type { MobileCompanionPairingRequestResult } from '../../../domain/models/mobile-companion.model';
import { requireCaseHandoverBridge } from './caseHandoverBridge';

export const EMPTY_MOBILE_DEVICE_DRAFT = { label: '', pairingResponse: '', securityCode: '' };
export type MobileDeviceDraft = typeof EMPTY_MOBILE_DEVICE_DRAFT;

interface PairingActions {
  setBusy: (busy: boolean) => void;
  clearSnapshot: () => void;
  showMessage: (message: string) => void;
  showError: (cause: unknown) => void;
  reloadDevices: () => Promise<void>;
  selectDevice: (id: string) => void;
}

export function useMobileDevicePairing(actions: PairingActions) {
  const [deviceDraft, setDeviceDraft] = useState(EMPTY_MOBILE_DEVICE_DRAFT);
  const [pairingRequest, setPairingRequest] = useState<MobileCompanionPairingRequestResult | null>(null);

  async function beginPairing(): Promise<boolean> {
    actions.setBusy(true);
    actions.clearSnapshot();
    try {
      const handover = await requireCaseHandoverBridge();
      setPairingRequest(await handover.createMobilePairingRequest());
      setDeviceDraft(EMPTY_MOBILE_DEVICE_DRAFT);
      actions.showMessage('Pairing-Anfrage wurde erstellt. Bitte in der Begleit-App eine Antwort erzeugen.');
      return true;
    } catch (cause) {
      actions.showError(cause);
      return false;
    } finally {
      actions.setBusy(false);
    }
  }

  function cancelPairing() {
    setPairingRequest(null);
    setDeviceDraft(EMPTY_MOBILE_DEVICE_DRAFT);
  }

  async function saveDevice(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    actions.setBusy(true);
    actions.clearSnapshot();
    try {
      const handover = await requireCaseHandoverBridge();
      const device = await handover.saveMobileDevice({ ...deviceDraft });
      cancelPairing();
      await actions.reloadDevices();
      actions.selectDevice(device.id);
      actions.showMessage('Mobilgerät wurde gekoppelt.');
      return true;
    } catch (cause) {
      actions.showError(cause);
      return false;
    } finally {
      actions.setBusy(false);
    }
  }

  return { deviceDraft, setDeviceDraft, pairingRequest, beginPairing, cancelPairing, saveDevice };
}
