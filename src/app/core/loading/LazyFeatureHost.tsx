import { useMemo, type ComponentType, type LazyExoticComponent } from "react";
import type { CaseRecord } from "../models/case.model";
import type { ViewId } from "../navigation/modules";
import type { ThemeMode } from "../../shared/theme/appTheme";
import type { CreateDeadlineInput, DeadlineRecord } from "../models/deadline.model";
import type { SbvParticipationViolationPrefill } from "../../features/participation-violations/sbvParticipationViolationViewLogic";
import type { CaseNodeTarget } from "../navigation/caseNodeTarget";
import type { CasesViewProps } from "../../features/cases/casesViewTypes";
import { LazyFeatureBoundary } from "./LazyFeatureBoundary";
import { getLazyFeatureComponent, preloadLazyFeature } from "./lazyFeatureViews";

type LazyFeatureHostProps = {
  view: ViewId;
  cases: CaseRecord[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onOpenParticipationViolationPrefill: (prefill: SbvParticipationViolationPrefill) => void;
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
  deadlines?: DeadlineRecord[];
  onNavigate?: (view: ViewId) => void;
  caseFeatureProps?: CasesViewProps;
};

export function LazyFeatureHost({ view, cases, theme, onThemeChange, onCreateDeadline, onOpenParticipationViolationPrefill, onOpenCaseNode, deadlines = [], onNavigate, caseFeatureProps }: LazyFeatureHostProps) {
  const Feature = useMemo(() => getLazyFeatureComponent(view), [view]);
  if (!Feature) return null;

  const CasesFeature = Feature as LazyExoticComponent<ComponentType<{ cases: CaseRecord[] }>>;
  const CaseWorkbenchFeature = Feature as LazyExoticComponent<ComponentType<CasesViewProps>>;
  const SettingsFeature = Feature as LazyExoticComponent<ComponentType<{
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
    cases: CaseRecord[];
  }>>;
  const RecruitingFeature = Feature as LazyExoticComponent<ComponentType<{
    onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
    onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
  }>>;
  const CaseNodeFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    onOpenCaseNode: (target: CaseNodeTarget) => void;
  }>>;
  const SbvControlFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    deadlines: DeadlineRecord[];
    onNavigate?: (viewId: ViewId) => void;
    initialSection?: "meetings";
  }>>;
  return (
    <LazyFeatureBoundary view={view} onRetry={() => { void preloadLazyFeature(view).catch(() => undefined); }}>
      {view === "cases" && caseFeatureProps ? (
        <CaseWorkbenchFeature {...caseFeatureProps} />
      ) : view === "knowledge" ? (
        <CasesFeature cases={cases} />
      ) : ["bem", "prevention", "participation", "equalization", "termination_hearing"].includes(view) && onOpenCaseNode ? (
        <CaseNodeFeature cases={cases} onOpenCaseNode={onOpenCaseNode} />
      ) : view === "sbv_control" || view === "meetings" ? (
        <SbvControlFeature cases={cases} deadlines={deadlines} onNavigate={onNavigate} initialSection={view === "meetings" ? "meetings" : undefined} />
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
