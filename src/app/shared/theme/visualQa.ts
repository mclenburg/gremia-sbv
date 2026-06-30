export type VisualTheme = 'light' | 'dark';

export type VisualQaRoute = {
  readonly id: string;
  readonly navName: string;
  readonly heading: RegExp;
};

export const VISUAL_QA_ROUTES: readonly VisualQaRoute[] = [
  { id: 'dashboard', navName: 'Dashboard', heading: /Dashboard/i },
  { id: 'persons', navName: 'Personen', heading: /Personenverzeichnis/i },
  { id: 'cases', navName: 'Fallakte', heading: /Fälle/i },
  { id: 'deadlines', navName: 'Fristen', heading: /Fristen/i },
  { id: 'activity_journal', navName: 'Journal', heading: /Tätigkeitsjournal/i },
  { id: 'bem', navName: 'BEM', heading: /BEM/i },
  { id: 'prevention', navName: 'Prävention', heading: /Präventionsverfahren/i },
  { id: 'participation_violations', navName: 'Verstöße', heading: /Beteiligungsverstöße/i },
  { id: 'participation', navName: 'Beteiligung', heading: /SBV-Beteiligung/i },
  { id: 'recruiting_participations', navName: 'Stellenbesetzungen', heading: /Stellenbesetzungen/i },
  { id: 'workplace_accommodation', navName: 'Arbeitsplatz', heading: /Arbeitsplatzgestaltung/i },
  { id: 'equalization', navName: 'Gleichstellung', heading: /Gleichstellung|GdB/i },
  { id: 'termination_hearing', navName: 'Kündigung', heading: /Kündigungsanhörung/i },
  { id: 'templates', navName: 'Vorlagen', heading: /Vorlagen/i },
  { id: 'knowledge', navName: 'Wissen', heading: /Wissen/i },
  { id: 'contacts', navName: 'Kontakte', heading: /Kontakte/i },
  { id: 'compliance', navName: 'Compliance', heading: /Compliance Center/i },
  { id: 'sbv_control', navName: 'Steuerung', heading: /SBV-Steuerung/i },
  { id: 'reports', navName: 'Berichte', heading: /Berichte/i },
  { id: 'settings', navName: 'Einstellungen', heading: /Einstellungen/i },
];


export const WORKBENCH_LAYOUT_QA_EXEMPT_ROUTE_IDS = [
  'workplace_accommodation',
  'settings',
] as const;

export function isWorkbenchLayoutQaExemptRoute(routeId: string): boolean {
  return (WORKBENCH_LAYOUT_QA_EXEMPT_ROUTE_IDS as readonly string[]).includes(routeId);
}

export const WORKBENCH_LAYOUT_QA_ROUTES = VISUAL_QA_ROUTES.filter(
  (route) => !isWorkbenchLayoutQaExemptRoute(route.id),
);


export const HELP_DIALOG_QA_ROUTE_IDS = [
  'recruiting_participations',
  'participation_violations',
  'activity_journal',
] as const;

export function isHelpDialogQaRoute(routeId: string): boolean {
  return (HELP_DIALOG_QA_ROUTE_IDS as readonly string[]).includes(routeId);
}

export const VISUAL_QA_SURFACE_SELECTORS = [
  '.industrial-topbar',
  '.industrial-sidebar',
  '.industrial-card',
  '.industrial-panel',
  '.industrial-module-header',
  '.industrial-workbench-header',
  '.industrial-workbench-content',
  '.industrial-workbench-sidebar',
  '.industrial-subpanel',
  '.industrial-record-card',
  '.industrial-selection-card',
  '.industrial-status-card',
  '.workbench-summary-card',
  '.industrial-search-toolbar',
  '.industrial-empty-state',
  '.industrial-data-table-shell',
  '.industrial-modal',
  '.text-command-help-modal',
  '.text-command-help-group',
  '.text-command-help-card',
  '.industrial-version-badge',
].join(', ');

export const VISUAL_QA_BADGE_SELECTORS = [
  '.industrial-status-badge',
  '.dashboard-focus-marker',
  '.person-lifecycle-badge',
  '.industrial-chip',
].join(', ');

export const VISUAL_QA_CONTROL_SELECTORS = [
  '.industrial-input',
  '.industrial-select',
  '.industrial-field input',
  '.industrial-field select',
  '.industrial-field textarea',
  '.industrial-modal input:not([type="checkbox"]):not([type="radio"])',
  '.industrial-modal select',
  '.industrial-modal textarea',
  '.knowledge-search-bar input',
  '.knowledge-search-bar select',
  '.template-filter-form select',
  '.person-edit-form select',
].join(', ');

export type VisualSurfaceSample = {
  readonly selector: string;
  readonly backgroundLuminance: number;
  readonly textLuminance?: number;
  readonly area: number;
};

export function isLargeSurface(area: number): boolean {
  return area >= 5_000;
}

export function isLightModeDarkFallback(sample: VisualSurfaceSample): boolean {
  return isLargeSurface(sample.area) && sample.backgroundLuminance < 145;
}

export function isDarkModeLightLeak(sample: VisualSurfaceSample): boolean {
  return isLargeSurface(sample.area) && sample.backgroundLuminance > 235;
}

export function isReadableSurfaceContrast(sample: VisualSurfaceSample, minimumDelta = 42): boolean {
  if (typeof sample.textLuminance !== 'number') return true;
  return Math.abs(sample.backgroundLuminance - sample.textLuminance) >= minimumDelta;
}

export function isRoundedLegacyPill(radiusPx: number): boolean {
  return radiusPx > 8;
}
