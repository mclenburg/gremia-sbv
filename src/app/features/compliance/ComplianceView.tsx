import { ModuleFeedback } from "../../shared/components/ModuleFeedback";
import {
  WorkbenchPage,
  WorkbenchWorkspace,
} from "../../shared/components/WorkbenchLayout";
import { ComplianceDocumentsPanel } from "./components/ComplianceDocumentsPanel";
import { ComplianceDsarPanel } from "./components/ComplianceDsarPanel";
import { ComplianceIncidentsPanel } from "./components/ComplianceIncidentsPanel";
import { ComplianceSelfCheckPanel } from "./components/ComplianceSelfCheckPanel";
import { ComplianceStatusPanel } from "./components/ComplianceStatusPanel";
import { ComplianceWorkspaceNav } from "./components/ComplianceWorkspaceNav";
import { useComplianceCenter } from "./useComplianceCenter";

export function ComplianceView() {
  const state = useComplianceCenter();

  return (
    <WorkbenchPage
      title="Compliance Center"
      description="Datenschutz, Sicherheit, Integrität, Audit, Systemzustand, Vorfälle, Betroffenenrechte und Freigabeunterlagen."
    >
      <ModuleFeedback
        items={[
          state.message
            ? { id: "compliance-message", message: state.message }
            : null,
        ]}
      />
      <WorkbenchWorkspace
        ariaLabel="Compliance-Arbeitsbereiche"
        navigation={
          <ComplianceWorkspaceNav
            active={state.workspace}
            onChange={state.setWorkspace}
          />
        }
      >
        <>
          {state.workspace === "system" && (
            <ComplianceStatusPanel
              overview={state.statusOverview}
              onRefresh={() => void state.refreshStatus()}
            />
          )}
          {state.workspace === "self_check" && (
            <ComplianceSelfCheckPanel
              result={state.selfCheck}
              onRefresh={() => void state.refreshSelfCheck()}
            />
          )}
          {state.workspace === "incidents" && (
            <ComplianceIncidentsPanel
              incidents={state.incidents}
              onCreate={(input) => void state.createIncident(input)}
              onUpdate={(id, input) => void state.updateIncident(id, input)}
            />
          )}
          {state.workspace === "documents" && (
            <ComplianceDocumentsPanel
              descriptors={state.descriptors}
              selectedType={state.selectedType}
              document={state.document}
              onRender={state.render}
              onDownload={state.downloadCurrent}
              onExportPdf={(open) => void state.exportPdfCurrent(open)}
            />
          )}
          {state.workspace === "dsar" && (
            <ComplianceDsarPanel
              dsarInput={state.dsarInput}
              document={state.document}
              onInputChange={state.updateDsarInput}
              onPrefill={() => void state.prefillDsar()}
              onRenderDsar={state.renderDsar}
              onDownload={state.downloadCurrent}
              onExportPdf={(open) => void state.exportPdfCurrent(open)}
            />
          )}
        </>
      </WorkbenchWorkspace>
    </WorkbenchPage>
  );
}
