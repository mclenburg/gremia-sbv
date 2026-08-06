import { useMemo, type ComponentType, type LazyExoticComponent } from "react";
import type { CaseRecord } from "../models/case.model";
import type { ViewId } from "../navigation/modules";
import type { ThemeMode } from "../../shared/theme/appTheme";
import type { CreateDeadlineInput } from "../models/deadline.model";
import type { SbvParticipationViolationPrefill } from "../../features/participation-violations/sbvParticipationViolationViewLogic";
import { LazyFeatureBoundary } from "./LazyFeatureBoundary";
import { getLazyFeatureComponent, preloadLazyFeature } from "./lazyFeatureViews";

type LazyFeatureHostProps = {
  view: ViewId;
  cases: CaseRecord[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onOpenParticipationViolationPrefill: (prefill: SbvParticipationViolationPrefill) => void;
};

export function LazyFeatureHost({ view, cases, theme, onThemeChange, onCreateDeadline, onOpenParticipationViolationPrefill }: LazyFeatureHostProps) {
  const Feature = useMemo(() => getLazyFeatureComponent(view), [view]);
  if (!Feature) return null;

  const CasesFeature = Feature as LazyExoticComponent<ComponentType<{ cases: CaseRecord[] }>>;
  const SettingsFeature = Feature as LazyExoticComponent<ComponentType<{
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
    cases: CaseRecord[];
  }>>;
  const RecruitingFeature = Feature as LazyExoticComponent<ComponentType<{
    onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
    onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
  }>>;
  return (
    <LazyFeatureBoundary view={view} onRetry={() => { void preloadLazyFeature(view).catch(() => undefined); }}>
      {view === "knowledge" ? (
        <CasesFeature cases={cases} />
      ) : view === "settings" ? (
        <SettingsFeature theme={theme} onThemeChange={onThemeChange} cases={cases} />
      ) : view === "recruiting_participations" ? (
        <RecruitingFeature
          onCreateDeadline={onCreateDeadline}
          onOpenParticipationViolationPrefill={onOpenParticipationViolationPrefill}
        />
      ) : (
        <Feature />
      )}
    </LazyFeatureBoundary>
  );
}
