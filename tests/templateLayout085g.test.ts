import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../package.json';
import { APP_VERSION as RENDERER_APP_VERSION } from '../src/app/generated/appVersion';
import { APP_VERSION as SERVICE_APP_VERSION } from '../services/generated/appMetadata';

describe('0.8.5-g kompakte Vorlagen- und Layout-Optimierung', () => {
  const templatesView = readFileSync(join(process.cwd(), 'src/app/features/templates/TemplatesView.tsx'), 'utf8');
  const templateCss = readFileSync(join(process.cwd(), 'src/app/templateWorkbench.css'), 'utf8');
  const responsiveCss = readFileSync(join(process.cwd(), 'src/app/ui/responsiveDesign.css'), 'utf8');

  it('führt die Patch-Version zentral in package.json, Renderer und Services', () => {
    expect(packageJson.version).toBe('0.8.5-g');
    expect(RENDERER_APP_VERSION).toBe(packageJson.version);
    expect(SERVICE_APP_VERSION).toBe(packageJson.version);
  });

  it('nimmt den Abstand zwischen Sidebar und Inhalt zurück und nutzt die Breite vollständig', () => {
    expect(responsiveCss).toContain('--layout-content-max: none');
    expect(responsiveCss).toContain('max-width: none');
    expect(responsiveCss).toContain('margin-left: 0 !important');
    expect(responsiveCss).toContain('justify-self: stretch');
  });

  it('gruppiert, sortiert und paginiert die Vorlagenliste clientseitig', () => {
    expect(templatesView).toContain("type TemplateSortMode = 'category' | 'alphabetical'");
    expect(templatesView).toContain('function groupTemplates');
    expect(templatesView).toContain('TEMPLATE_PAGE_SIZE_OPTIONS');
    expect(templatesView).toContain('template-list-group');
    expect(templatesView).toContain('template-pagination');
    expect(templatesView).toContain('Thematisch gruppiert');
    expect(templatesView).toContain('Alphabetisch');
  });

  it('komprimiert den Detailbereich und ersetzt Tailwind-Spezialgrid durch zentrale CSS-Klassen', () => {
    expect(templatesView).toContain('template-workbench-grid');
    expect(templatesView).toContain('template-detail-panel');
    expect(templatesView).toContain('template-body-preview');
    expect(templatesView).not.toContain('xl:grid-cols-[0.9fr_1.4fr]');
    expect(templateCss).toContain('.template-workbench-grid');
    expect(templateCss).toContain('position: sticky');
    expect(templateCss).toContain('max-height: min(52vh, 30rem)');
  });
});
