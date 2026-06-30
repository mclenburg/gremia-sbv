import { describe, expect, it } from 'vitest';
import { modules } from '../src/app/core/navigation/modules';
import { HELP_DIALOG_QA_ROUTE_IDS, VISUAL_QA_ROUTES } from '../src/app/shared/theme/visualQa';

describe('0.9.5-e E2E coverage matrix', () => {
  it('covers every active primary navigation module in the visual and Axe route matrix', () => {
    const routeIds = new Set(VISUAL_QA_ROUTES.map((route) => route.id));
    const activeModuleIds = modules
      .filter((module) => module.status !== 'planned')
      .map((module) => module.id);

    expect(routeIds.has('dashboard')).toBe(true);
    expect(routeIds.has('settings')).toBe(true);
    expect(routeIds.has('recruiting_participations')).toBe(true);

    const missing = activeModuleIds.filter((id) => !routeIds.has(id));
    expect(missing, `Neue aktive Module müssen in VISUAL_QA_ROUTES für Visual- und Axe-E2E aufgenommen werden: ${missing.join(', ')}`).toEqual([]);
  });

  it('covers all help-dialog priority modules in the visual/Axe route matrix', () => {
    const routeIds = new Set(VISUAL_QA_ROUTES.map((route) => route.id));
    const missing = HELP_DIALOG_QA_ROUTE_IDS.filter((id) => !routeIds.has(id));
    expect(missing, `HelpDialog-Prioritätsmodule müssen in VISUAL_QA_ROUTES enthalten sein: ${missing.join(', ')}`).toEqual([]);
  });

});
