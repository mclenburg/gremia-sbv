import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  complianceFindingToTone,
  deadlineStateToTone,
  deadlineToTone,
  processStatusToTone,
  riskLevelToTone,
} from "../../src/app/shared/status/statusTone";

import { StatusBadge, RiskBadge, ComplianceBadge, ProcessStatusBadge, DeadlineBadge } from '../../src/app/shared/components/StatusBadges';
import { descendants, hasClasses, renderComponent, renderElement, visibleText } from '../helpers/renderedMarkup';

describe('status badge behavior', () => {
  it('renders a labelled status and hides its decorative icon from assistive technology', () => {
    const { tree, markup } = renderComponent(StatusBadge, {
      label: 'Prüfung erforderlich', tone: 'warning', ariaLabel: 'Bearbeitungsstatus: Prüfung erforderlich',
      icon: createElement('svg', { 'aria-label': 'Dekoration' }),
    });
    const nodes = descendants(tree);
    expect(nodes.some((node) => node.attrs['aria-label'] === 'Bearbeitungsstatus: Prüfung erforderlich')).toBe(true);
    expect(nodes.some((node) => hasClasses(node, ['industrial-status-badge-warning']))).toBe(true);
    expect(nodes.find((node) => node.tag === 'svg')?.parent?.attrs['aria-hidden']).toBe('true');
    expect(visibleText(markup)).toBe('Prüfung erforderlich');
  });

  it.each([
    { element: createElement(RiskBadge, { risk: 'high', label: 'Hoch' }), tone: 'danger', ariaLabel: 'Risiko Hoch', text: 'Hoch' },
    { element: createElement(ComplianceBadge, { finding: 'warning', label: 'Prüfauftrag' }), tone: 'warning', ariaLabel: 'Compliance Prüfauftrag', text: 'Prüfauftrag' },
    { element: createElement(ProcessStatusBadge, { status: 'closed', label: 'Abgeschlossen' }), tone: 'ok', ariaLabel: 'Status Abgeschlossen', text: 'Abgeschlossen' },
    { element: createElement(RiskBadge, { risk: null }), tone: 'default', ariaLabel: 'Risiko unbekannt', text: 'Unbekannt' },
  ])('renders $ariaLabel with its semantic tone and visible label', ({ element, tone, ariaLabel, text }) => {
    const { tree, markup } = renderElement(element);
    expect(descendants(tree).some((node) =>
      node.attrs['aria-label'] === ariaLabel && hasClasses(node, [`industrial-status-badge-${tone}`]),
    )).toBe(true);
    expect(visibleText(markup)).toBe(text);
  });

  it.each([
    { state: undefined, dueAt: '2026-05-23T10:00:00.000Z', tone: 'danger' },
    { state: undefined, dueAt: '2026-05-25T10:00:00.000Z', tone: 'warning' },
    { state: undefined, dueAt: '2026-06-01T10:00:00.000Z', tone: 'info' },
    { state: 'done', dueAt: '2026-05-23T10:00:00.000Z', tone: 'ok' },
  ])('renders deadline state $state and date $dueAt with tone $tone', ({ state, dueAt, tone }) => {
    const { tree, markup } = renderComponent(DeadlineBadge, {
      state, dueAt, today: new Date('2026-05-24T10:00:00.000Z'), label: 'Frist', ariaLabel: 'Friststatus',
    });
    expect(descendants(tree).some((node) =>
      node.attrs['aria-label'] === 'Friststatus' && hasClasses(node, [`industrial-status-badge-${tone}`]),
    )).toBe(true);
    expect(visibleText(markup)).toBe('Frist');
  });

  it("mappt Risiko-, Compliance-, Prozess- und Fristentöne positiv und negativ", () => {
    expect(riskLevelToTone("high")).toBe("danger");
    expect(riskLevelToTone("medium")).toBe("warning");
    expect(riskLevelToTone("low")).toBe("ok");
    expect(riskLevelToTone("nicht-bekannt")).toBe("default");

    expect(complianceFindingToTone("problem")).toBe("danger");
    expect(complianceFindingToTone("warning")).toBe("warning");
    expect(complianceFindingToTone("ok")).toBe("ok");
    expect(complianceFindingToTone("archiviert")).toBe("default");

    expect(processStatusToTone("closed")).toBe("ok");
    expect(processStatusToTone("in_review")).toBe("warning");
    expect(processStatusToTone("rejected")).toBe("danger");
    expect(processStatusToTone("suspended")).toBe("muted");
    expect(processStatusToTone("frei-text")).toBe("default");

    expect(deadlineStateToTone("overdue")).toBe("danger");
    expect(deadlineStateToTone("due_soon")).toBe("warning");
    expect(deadlineStateToTone("done")).toBe("ok");
    expect(deadlineStateToTone("hidden")).toBe("muted");
    expect(deadlineStateToTone("frei-text")).toBe("default");

    const today = new Date("2026-05-24T10:00:00.000Z");
    expect(deadlineToTone("2026-05-23T10:00:00.000Z", today)).toBe("danger");
    expect(deadlineToTone("2026-05-25T10:00:00.000Z", today)).toBe("warning");
    expect(deadlineToTone("2026-06-01T10:00:00.000Z", today)).toBe("info");
    expect(deadlineToTone("kein-datum", today)).toBe("default");
  });

});
