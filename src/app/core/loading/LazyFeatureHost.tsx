import { useMemo, type ComponentType, type LazyExoticComponent } from "react";
import type { CaseRecord } from "../../../domain/models/case.model";
import type { CaseMeasureRecord } from "../../../domain/models/case-measure.model";
import type { ProtectedPersonRecord } from "../../../domain/models/protected-person.model";
import type { ViewId } from "../navigation/modules";
import type { ThemeMode } from "../../shared/theme/appTheme";
import type { CreateDeadlineInput, DeadlineRecord } from "../../../domain/models/deadline.model";
import type { SbvParticipationViolationPrefill } from "../../features/participation-violations/sbvParticipationViolationViewLogic";
import type { CaseNodeTarget } from "../navigation/caseNodeTarget";
import type { DeadlineOpenTarget } from "../../features/deadlines/deadlineContext";
import type { CasesViewProps } from "../../features/cases/casesViewTypes";
import { LazyFeatureBoundary } from "./LazyFeatureBoundary";
import { getLazyFeatureComponent, preloadLazyFeature } from "./lazyFeatureViews";

type LazyFeatureHostProps = {
  view: ViewId;
  cases: CaseRecord[];
  measures?: CaseMeasureRecord[];
  persons?: ProtectedPersonRecord[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onOpenParticipationViolationPrefill: (prefill: SbvParticipationViolationPrefill) => void;
  onOpenCaseNode?: (target: CaseNodeTarget) => void;
  deadlines?: DeadlineRecord[];
  onNavigate?: (view: ViewId) => void;
  caseFeatureProps?: CasesViewProps;
  onRecordsChanged?: () => Promise<void>;
  recordTarget?: Extract<DeadlineOpenTarget, { kind: 'record' }> | null;
  onRecordTargetConsumed?: () => void;
};

export function LazyFeatureHost({ view, cases, measures = [], persons = [], theme, onThemeChange, onCreateDeadline, onOpenParticipationViolationPrefill, onOpenCaseNode, deadlines = [], onNavigate, caseFeatureProps, onRecordsChanged, recordTarget, onRecordTargetConsumed }: LazyFeatureHostProps) {
  const Feature = useMemo(() => getLazyFeatureComponent(view), [view]);
  if (!Feature) return null;

  const CasesFeature = Feature as LazyExoticComponent<ComponentType<{ cases: CaseRecord[] }>>;
  const CaseWorkbenchFeature = Feature as LazyExoticComponent<ComponentType<CasesViewProps>>;
  const HandoverFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    measures: CaseMeasureRecord[];
    onRecordsChanged: () => Promise<void>;
  }>>;
  const SettingsFeature = Feature as LazyExoticComponent<ComponentType<{
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
  }>>;
  const PrivacyReviewFeature = Feature as LazyExoticComponent<ComponentType<{
    onNavigate: (view: ViewId) => void;
    onOpenCaseNode: (target: CaseNodeTarget) => void;
  }>>;
  const RecruitingFeature = Feature as LazyExoticComponent<ComponentType<{
    onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
    onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
    targetId?: string;
    onTargetConsumed?: () => void;
  }>>;
  const ElectionFeature = Feature as LazyExoticComponent<ComponentType<{ targetId?: string; sourceEvent?: string; onTargetConsumed?: () => void }>>;
  const CaseNodeFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    onOpenCaseNode: (target: CaseNodeTarget) => void;
  }>>;
  const EqualizationFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    persons: ProtectedPersonRecord[];
    onOpenCaseNode: (target: CaseNodeTarget) => void;
    onRecordsChanged: () => Promise<void>;
  }>>;
  const SbvControlFeature = Feature as LazyExoticComponent<ComponentType<{
    cases: CaseRecord[];
    deadlines: DeadlineRecord[];
    onNavigate?: (viewId: ViewId) => void;
    initialSection?: "meetings";
    targetProtocolId?: string;
    onTargetConsumed?: () => void;
  }>>;
  return (
    <LazyFeatureBoundary view={view} onRetry={() => { void preloadLazyFeature(view).catch(() => undefined); }}>
      {view === "cases" && caseFeatureProps ? (
        <CaseWorkbenchFeature {...caseFeatureProps} />
      ) : view === "case_handover" && onRecordsChanged ? (
        <HandoverFeature cases={cases} measures={measures} onRecordsChanged={onRecordsChanged} />
      ) : view === "knowledge" ? (
        <CasesFeature cases={cases} />
      ) : view === "equalization" && onOpenCaseNode && onRecordsChanged ? (
        <EqualizationFeature cases={cases} persons={persons} onOpenCaseNode={onOpenCaseNode} onRecordsChanged={onRecordsChanged} />
      ) : ["bem", "prevention", "participation", "termination_hearing"].includes(view) && onOpenCaseNode ? (
        <CaseNodeFeature cases={cases} onOpenCaseNode={onOpenCaseNode} />
      ) : view === "sbv_control" || view === "meetings" ? (
        <SbvControlFeature cases={cases} deadlines={deadlines} onNavigate={onNavigate} initialSection={view === "meetings" ? "meetings" : undefined}
          targetProtocolId={recordTarget?.view === 'sbv_control' ? recordTarget.recordId : undefined} onTargetConsumed={onRecordTargetConsumed} />
      ) : view === "settings" ? (
        <SettingsFeature theme={theme} onThemeChange={onThemeChange} />
      ) : view === "privacy_review" && onNavigate && onOpenCaseNode ? (
        <PrivacyReviewFeature onNavigate={onNavigate} onOpenCaseNode={onOpenCaseNode} />
      ) : view === "recruiting_participations" ? (
        <RecruitingFeature
          onCreateDeadline={onCreateDeadline}
          onOpenParticipationViolationPrefill={onOpenParticipationViolationPrefill}
          targetId={recordTarget?.view === view ? recordTarget.recordId : undefined}
          onTargetConsumed={onRecordTargetConsumed}
        />
      ) : view === "elections" ? (
        <ElectionFeature targetId={recordTarget?.view === view ? recordTarget.recordId : undefined} sourceEvent={recordTarget?.sourceEvent} onTargetConsumed={onRecordTargetConsumed} />
      ) : (
        <Feature />
      )}
    </LazyFeatureBoundary>
  );
}
