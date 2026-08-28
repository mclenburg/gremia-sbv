import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  GremiaBrApiMode,
  GremiaBrCachedOverview,
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
} from "../../../domain/models/gremia-br.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";

export { waitForBridge };

type Announce = (message: string, politeness?: "polite" | "assertive") => void;

export const EMPTY_GREMIA_BR_SETTINGS: GremiaBrPublicSettings = {
  enabled: false,
  serverUrl: "",
  username: "",
  hasStoredCredentials: false,
  apiMode: "legacy_read_bridge",
  relevanceSettings: { groups: [] },
};

export const EMPTY_GREMIA_BR_CACHE: GremiaBrCachedOverview = {
  upcomingMeetings: [],
  pendingFollowUps: [],
  decisions: [],
  dueDecisions: [],
  meetingAgendas: {},
  overdueDecisions: [],
};

export function gremiaBrStatusText(result?: { message: string }): string {
  return result?.message ?? "";
}

export const GREMIA_BR_SETTINGS_CHANGED_EVENT = "gremia-sbv:gremia-br-settings-changed";

export function notifyGremiaBrSettingsChanged(): void {
  window.dispatchEvent(new Event(GREMIA_BR_SETTINGS_CHANGED_EVENT));
}

export interface GremiaBrSettingsSetters {
  setSettings: Dispatch<SetStateAction<GremiaBrPublicSettings>>;
  setCache: Dispatch<SetStateAction<GremiaBrCachedOverview>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setServerUrl: Dispatch<SetStateAction<string>>;
  setUsername: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setApiMode: Dispatch<SetStateAction<GremiaBrApiMode>>;
  setSelectedBodyId: Dispatch<SetStateAction<string>>;
  setSelectedBodyName: Dispatch<SetStateAction<string>>;
  setSelectedOrganizationId: Dispatch<SetStateAction<string>>;
  setSelectedSecurityDomain: Dispatch<SetStateAction<string>>;
  setRelevanceGroups: Dispatch<SetStateAction<GremiaBrRelevanceKeywordGroup[]>>;
  setError: Dispatch<SetStateAction<string>>;
}

export function applyGremiaBrSettingsSnapshot(
  next: GremiaBrPublicSettings,
  cached: GremiaBrCachedOverview,
  setters: GremiaBrSettingsSetters,
): void {
  setters.setSettings(next);
  setters.setCache(cached);
  setters.setEnabled(next.enabled);
  setters.setServerUrl(next.serverUrl);
  setters.setUsername(next.username);
  setters.setPassword("");
  setters.setApiMode(next.apiMode);
  setters.setSelectedBodyId(next.selectedBodyId ?? "");
  setters.setSelectedBodyName(next.selectedBodyName ?? "");
  setters.setSelectedOrganizationId(next.selectedOrganizationId ?? "");
  setters.setSelectedSecurityDomain(next.selectedSecurityDomain ?? "");
  setters.setRelevanceGroups(next.relevanceSettings.groups);
}

export async function loadGremiaBrSettingsSnapshot(setters: GremiaBrSettingsSetters): Promise<void> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Einstellungsdienst ist nicht erreichbar.");
  applyGremiaBrSettingsSnapshot(
    await bridge.gremiaBr.getSettings(),
    await bridge.gremiaBr.getCachedOverview(),
    setters,
  );
}

export function useInitialGremiaBrSettingsLoad(setters: GremiaBrSettingsSetters, announce: Announce): void {
  useEffect(() => {
    let active = true;
    void loadGremiaBrSettingsSnapshot(setters).catch((err) => {
      if (!active) return;
      const message = err instanceof Error ? err.message : "Gremia.BR-Einstellungen konnten nicht geladen werden.";
      setters.setError(message);
      announce(message, "assertive");
    });
    return () => { active = false; };
  }, [announce, setters]);
}
