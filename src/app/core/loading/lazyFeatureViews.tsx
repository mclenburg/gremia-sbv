import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ViewId } from "../navigation/modules";

export type LazyFeatureComponent = LazyExoticComponent<ComponentType<object>>;

type LazyFeatureDefinition = {
  load: () => Promise<{ default: ComponentType<object> }>;
  label: string;
};

const definitions: Partial<Record<ViewId, LazyFeatureDefinition>> = {

  cases: {
    label: "Fallakten",
    load: async () => {
      const module = await import("../../features/cases/CasesView");
      return { default: module.CasesView as ComponentType<object> };
    },
  },
  bem: {
    label: "BEM-Verfahren",
    load: async () => {
      const module = await import("../../features/bem/BemView");
      return { default: module.BemView as ComponentType<object> };
    },
  },
  prevention: {
    label: "Präventionsverfahren",
    load: async () => {
      const module = await import("../../features/prevention/PreventionView");
      return { default: module.PreventionView as ComponentType<object> };
    },
  },
  participation: {
    label: "SBV-Beteiligungsmonitor",
    load: async () => {
      const module = await import("../../features/participation/ParticipationView");
      return { default: module.ParticipationView as ComponentType<object> };
    },
  },
  equalization: {
    label: "Gleichstellung",
    load: async () => {
      const module = await import("../../features/equalization/EqualizationView");
      return { default: module.EqualizationView as ComponentType<object> };
    },
  },
  termination_hearing: {
    label: "Kündigungsanhörung",
    load: async () => {
      const module = await import("../../features/termination/TerminationView");
      return { default: module.TerminationView as ComponentType<object> };
    },
  },
  sbv_control: {
    label: "SBV-Control",
    load: async () => {
      const module = await import("../../features/sbv-control/SbvControlView");
      return { default: module.SbvControlView as ComponentType<object> };
    },
  },
  knowledge: {
    label: "Wissensbereich",
    load: async () => {
      const module = await import("../../features/knowledge/KnowledgeView");
      return { default: module.KnowledgeView as ComponentType<object> };
    },
  },
  templates: {
    label: "Vorlagenverwaltung",
    load: async () => {
      const module = await import("../../features/templates/TemplatesView");
      return { default: module.TemplatesView };
    },
  },
  reports: {
    label: "Berichte und Auswertungen",
    load: async () => {
      const module = await import("../../features/reports/ReportsView");
      return { default: module.ReportsView };
    },
  },
  compliance: {
    label: "Compliance-Center",
    load: async () => {
      const module = await import("../../features/compliance/ComplianceView");
      return { default: module.ComplianceView };
    },
  },
  recruiting_participations: {
    label: "Beteiligung bei Stellenbesetzungen",
    load: async () => {
      const module = await import("../../features/recruiting/RecruitingParticipationsView");
      return { default: module.RecruitingParticipationsView as ComponentType<object> };
    },
  },
  settings: {
    label: "Einstellungen",
    load: async () => {
      const module = await import("../../features/settings/SettingsHub");
      return { default: module.SettingsHub as ComponentType<object> };
    },
  },
};

const components = new Map<ViewId, LazyFeatureComponent>();
const preloadPromises = new Map<ViewId, Promise<unknown>>();

export function isLazyFeatureView(view: ViewId): boolean {
  return Boolean(definitions[view]);
}

export function lazyFeatureLabel(view: ViewId): string {
  return definitions[view]?.label ?? "Bereich";
}

export function getLazyFeatureComponent(view: ViewId): LazyFeatureComponent | null {
  const definition = definitions[view];
  if (!definition) return null;
  const existing = components.get(view);
  if (existing) return existing;
  const component = lazy(definition.load);
  components.set(view, component);
  return component;
}

export function preloadLazyFeature(view: ViewId): Promise<unknown> {
  const definition = definitions[view];
  if (!definition) return Promise.resolve();
  const existing = preloadPromises.get(view);
  if (existing) return existing;
  const pending = definition.load().catch((error: unknown) => {
    preloadPromises.delete(view);
    throw error;
  });
  preloadPromises.set(view, pending);
  return pending;
}
