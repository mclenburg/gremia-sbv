import { describe, expect, it, vi } from 'vitest';
import { requestExternalPreview } from '../../../electron/ipc/externalPreviewRequest';

describe('externer Dokumentaufruf', () => {
  it('wertet den ausgelösten Programmaufruf unabhängig von dessen späterem Ergebnis als angefordert', async () => {
    const opener = vi.fn(async () => 'Diagnose der externen Anwendung');

    expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).toBe(true);
    expect(opener).toHaveBeenCalledOnce();
    await expect(opener.mock.results[0].value).resolves.toBe('Diagnose der externen Anwendung');
  });

  it('fängt eine spätere Ablehnung des externen Programms ohne unhandled rejection ab', async () => {
    const opener = vi.fn(async () => { throw new Error('extern abgelehnt'); });

    expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('meldet nur einen synchron nicht auslösbaren Programmaufruf als nicht angefordert', () => {
    const opener = vi.fn(() => { throw new Error('Aufruf nicht möglich'); });

    expect(requestExternalPreview('/isolierte-vorschau/einladung.pdf', opener)).toBe(false);
  });
});
