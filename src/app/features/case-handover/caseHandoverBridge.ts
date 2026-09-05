import { waitForBridge } from '../../core/bridge/waitForBridge';

export async function requireCaseHandoverBridge() {
  const bridge = await waitForBridge();
  if (!bridge?.caseHandover) throw new Error('Übergabedienst ist nicht erreichbar.');
  return bridge.caseHandover;
}
