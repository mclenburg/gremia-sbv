import { describe, expect, it, vi } from 'vitest';
import { requestExternalPreview } from '../../../electron/ipc/externalPreviewRequest';

describe('externer Dokumentaufruf', () => {
  it('wertet den ausgelösten Programmaufruf unabhängig von dessen späterem Ergebnis als angefordert', async () => {
    const opener = vi.fn(async () => '');

    await expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).resolves.toBe(true);
    expect(opener).toHaveBeenCalledOnce();
  });

  it('meldet einen direkt abgelehnten Betriebssystem-Aufruf als nicht angefordert', async () => {
    const opener = vi.fn(async () => 'Diagnose der externen Anwendung');

    await expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).resolves.toBe(false);
  });

  it('meldet nur einen synchron nicht auslösbaren Programmaufruf als nicht angefordert', () => {
    const opener = vi.fn(() => { throw new Error('Aufruf nicht möglich'); });

    return expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).resolves.toBe(false);
  });
});
