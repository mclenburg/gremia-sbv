import { describe, expect, it } from "vitest";
import type { GremiaBrDashboardOverview, GremiaBrPublicSettings } from "../../src/domain/models/gremia-br.model";
import {
  caseOptions,
  documentOptions,
  meetingOptions,
  resolveGremiaBrDecisionRows,
  resolveGremiaBrMeetingRows,
  resolveGremiaBrWorkspaceActionRows,
  resolveGremiaBrWorkspaceSummary,
} from "../../src/app/features/gremia-br/gremiaBrWorkspaceModel";

const SETTINGS: GremiaBrPublicSettings = {
  enabled: true,
  serverUrl: "https://br.example.invalid",
  username: "sbv",
  hasStoredCredentials: true,
  apiMode: "gremia_br_v2",
  selectedBodyId: "body-1",
  selectedBodyName: "SBV Testbetrieb",
  relevanceSettings: { groups: [] },
};

function overview(): GremiaBrDashboardOverview {
  const relevantMeeting = {
    id: "meeting-1",
    title: "SBV-Jahresplanung",
    plannedStart: "2026-10-01T09:00:00.000Z",
  };
  return {
    upcomingMeetings: [
      relevantMeeting,
      { id: "meeting-2", title: "Regelsitzung", plannedStart: "2026-10-08T09:00:00.000Z" },
    ],
    meetingAgendas: {},
    pendingFollowUps: [],
    decisions: [
      { id: "decision-1", text: "Barrierefreie Unterlage anfordern", decidedAt: "2026-10-01T10:00:00.000Z", status: "FINAL" },
    ],
    dueDecisions: [],
    overdueDecisions: [],
    relevanceSettings: { groups: [] },
    relevantMeetings: [{ item: relevantMeeting, matchedGroups: ["Schwerbehinderung"], matchedKeywords: ["sbv"] }],
    openDecisionCount: 1,
    dueDecisionCount: 0,
    overdueDecisionCount: 0,
  };
}

describe("Gremia.BR-Arbeitsbereich View-Model", () => {
  it("fasst den gewählten v2-Arbeitsbereich und lokalen Lesecache zusammen", () => {
    const summary = resolveGremiaBrWorkspaceSummary(SETTINGS, overview());

    expect(summary).toEqual([
      { label: "API-Modus", value: "2.0" },
      { label: "Sitzungen im Cache", value: "2" },
      { label: "SBV-Treffer", value: "1", tone: "warning" },
      { label: "Beschlüsse", value: "1" },
    ]);
  });

  it("bereitet gelesene Sitzungen und Beschlüsse ohne technische Eingabe-IDs für zentrale Tabellen auf", () => {
    const state = overview();

    expect(resolveGremiaBrMeetingRows(state)[0].cells).toEqual([
      "SBV-Jahresplanung",
      "2026-10-01T09:00:00.000Z",
      "SBV-relevant",
    ]);
    expect(resolveGremiaBrDecisionRows(state)[0].cells).toEqual([
      "Barrierefreie Unterlage anfordern",
      "2026-10-01T10:00:00.000Z",
      "FINAL",
    ]);
  });

  it("bereitet umfangreiche Fall-, Dokument- und Sitzungsauswahlen für filterbare Standardfelder auf", () => {
    const state = overview();

    expect(caseOptions([
      { id: "case-b", caseNumber: "SBV-002", displayName: "Arbeitsplatz", category: "arbeitsplatzgestaltung", status: "offen", priority: "normal", openedAt: "2026-01-02", isPseudonymized: false, isLocked: false },
      { id: "case-a", caseNumber: "SBV-001", displayName: "BEM", category: "bem", status: "offen", priority: "normal", openedAt: "2026-01-01", isPseudonymized: false, isLocked: false },
    ])).toEqual([
      { value: "", label: "Fallakte auswählen …" },
      { value: "case-a", label: "SBV-001 · BEM" },
      { value: "case-b", label: "SBV-002 · Arbeitsplatz" },
    ]);
    expect(documentOptions([
      { id: "doc-1", title: "Fallzusammenfassung", filename: "fall.pdf", mimeType: "application/pdf", caseNumber: "SBV-001", documentKind: "gremia_br_case_summary", createdAt: "2026-10-01" },
    ])[1].label).toContain("Fall SBV-001");
    expect(meetingOptions(state)[1]).toEqual({
      value: "meeting-1",
      label: "2026-10-01T09:00:00.000Z · SBV-Jahresplanung",
    });
  });

  it("bereitet Gremia.BR-Arbeitsbereichsaktionen ohne Rohstatus für die Kontrollsicht auf", () => {
    expect(resolveGremiaBrWorkspaceActionRows([{
      id: "action-1",
      actionType: "document_shared",
      localDocumentId: "doc-1",
      localDocumentTitle: "Fallzusammenfassung",
      caseId: "case-1",
      caseNumber: "SBV-2026-001",
      targetBodyName: "Betriebsrat",
      purpose: "BR informieren",
      status: "requested",
      createdAt: "2026-10-01T12:00:00.000Z",
    }])).toEqual([{
      id: "action-1",
      cells: [
        "2026-10-01T12:00:00.000Z",
        "PDF freigeben",
        "Fallzusammenfassung · Fall SBV-2026-001",
        "Betriebsrat",
        "Angefordert",
      ],
    }]);
  });
});
