import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("0.4.42 feature modules, hooks and services", () => {
  it("extracts contacts and reports into feature modules", () => {
    expect(existsSync("src/app/features/contacts/ContactsView.tsx")).toBe(true);
    expect(existsSync("src/app/features/contacts/contactDisplay.ts")).toBe(true);
    expect(existsSync("src/app/features/reports/ReportsView.tsx")).toBe(true);
    expect(existsSync("src/app/features/reports/useReports.ts")).toBe(true);
    expect(existsSync("src/app/features/reports/reportService.ts")).toBe(true);
  });

  it("keeps App importing feature modules directly", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("import { ContactsView } from './features/contacts/ContactsView';");
    expect(app).toContain("import { ReportsView } from './features/reports/ReportsView';");
  });

  it("removes ContactsView and ReportsView from workflowViews", () => {
    const workflowViews = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflowViews).not.toContain("export function ContactsView");
    expect(workflowViews).not.toContain("export function ReportsView");
    expect(workflowViews).not.toContain("const REPORT_TYPE_ORDER");
  });

  it("separates report hook and service responsibilities", () => {
    const hook = readFileSync("src/app/features/reports/useReports.ts", "utf8");
    const service = readFileSync("src/app/features/reports/reportService.ts", "utf8");
    expect(hook).toContain("export function useReports");
    expect(service).toContain("export async function loadReportMetadata");
    expect(service).toContain("export async function generateReportDocument");
  });
});
