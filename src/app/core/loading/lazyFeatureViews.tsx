import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ViewId } from "../navigation/modules";

export type LazyFeatureComponent = LazyExoticComponent<ComponentType<object>>;

type LazyFeatureDefinition = {
  load: () => Promise<{ default: ComponentType<object> }>;
  label: string;
};

const definitions: Partial<Record<ViewId, LazyFeatureDefinition>> = {
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
