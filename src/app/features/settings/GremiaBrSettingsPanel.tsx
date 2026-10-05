import { useMemo, useState } from 'react';
import type {
  GremiaBrPublicSettings,
  GremiaBrRelevanceKeywordGroup,
  GremiaBrWorkspaceBody,
} from '../../../domain/models/gremia-br.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import {
  GremiaBrCredentialsSection,
  GremiaBrEnabledToggle,
  GremiaBrStartupRefreshToggle,
  GremiaBrFeedback,
  GremiaBrRelevanceSection,
  GremiaBrSettingsActions,
  GremiaBrSettingsIntro,
  GremiaBrSettingsMeta,
  GremiaBrWorkspaceBodySection,
} from './GremiaBrSettingsSections';
import {
  EMPTY_GREMIA_BR_CACHE,
  EMPTY_GREMIA_BR_SETTINGS,
  useInitialGremiaBrSettingsLoad,
  type GremiaBrSettingsSetters,
} from './gremiaBrSettingsState';
import { createGremiaBrSettingsActions } from './gremiaBrSettingsActions';

export function GremiaBrSettingsPanel() {
  const announce = useAnnouncer();
  const [settings, setSettings] = useState<GremiaBrPublicSettings>(EMPTY_GREMIA_BR_SETTINGS);
  const [cache, setCache] = useState(EMPTY_GREMIA_BR_CACHE);
  const [enabled, setEnabled] = useState(false);
  const [autoRefreshOnStartup, setAutoRefreshOnStartup] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBodyId, setSelectedBodyId] = useState('');
  const [selectedBodyName, setSelectedBodyName] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedSecurityDomain, setSelectedSecurityDomain] = useState('');
  const [workspaceBodies, setWorkspaceBodies] = useState<GremiaBrWorkspaceBody[]>([]);
  const [bodySearch, setBodySearch] = useState('');
  const [relevanceGroups, setRelevanceGroups] = useState<GremiaBrRelevanceKeywordGroup[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setters = useMemo<GremiaBrSettingsSetters>(() => ({
    setSettings,
    setCache,
    setEnabled,
    setAutoRefreshOnStartup,
    setServerUrl,
    setUsername,
    setPassword,
    setSelectedBodyId,
    setSelectedBodyName,
    setSelectedOrganizationId,
    setSelectedSecurityDomain,
    setRelevanceGroups,
    setError,
  }), []);

  useInitialGremiaBrSettingsLoad(setters, announce);

  const { save, clearCredentials, testConnection, refreshCache, loadWorkspaceBodies, selectWorkspaceBody } = createGremiaBrSettingsActions({
    input: {
      enabled, autoRefreshOnStartup, serverUrl, username,
      selectedBodyId, selectedBodyName, selectedOrganizationId, selectedSecurityDomain,
      relevanceSettings: { groups: relevanceGroups },
    },
    password, setters, setBusy, setStatus, setWorkspaceBodies, announce,
  });

  function updateRelevanceGroupKeywords(groupId: string, value: string) {
    const keywords = value.split(',').map((item) => item.trim()).filter(Boolean);
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, keywords } : group));
  }

  function toggleRelevanceGroup(groupId: string, checked: boolean) {
    setRelevanceGroups((groups) => groups.map((group) => group.id === groupId ? { ...group, enabled: checked } : group));
  }

  const normalizedBodySearch = bodySearch.trim().toLowerCase();
  const filteredWorkspaceBodies = normalizedBodySearch
    ? workspaceBodies.filter((body) => body.bodyName.toLowerCase().includes(normalizedBodySearch))
    : workspaceBodies;

  return (
    <section className="gremia-br-settings-layout" aria-labelledby="gremia-br-settings-title">
      <GremiaBrSettingsIntro />
      <GremiaBrFeedback error={error} status={status} />
      <GremiaBrEnabledToggle enabled={enabled} onEnabledChange={setEnabled} />
      <GremiaBrStartupRefreshToggle enabled={enabled} checked={autoRefreshOnStartup} onCheckedChange={setAutoRefreshOnStartup} />
      <GremiaBrCredentialsSection
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        username={username}
        onUsernameChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        hasStoredCredentials={settings.hasStoredCredentials}
      />
      <GremiaBrWorkspaceBodySection
        visible={enabled}
        busy={busy}
        enabled={enabled}
        selectedBodyName={selectedBodyName}
        workspaceBodies={workspaceBodies}
        filteredWorkspaceBodies={filteredWorkspaceBodies}
        bodySearch={bodySearch}
        onBodySearchChange={setBodySearch}
        onLoadWorkspaceBodies={() => void loadWorkspaceBodies()}
        onSelectWorkspaceBody={selectWorkspaceBody}
      />
      <GremiaBrRelevanceSection
        relevanceGroups={relevanceGroups}
        onKeywordsChange={updateRelevanceGroupKeywords}
        onGroupEnabledChange={toggleRelevanceGroup}
      />
      <GremiaBrSettingsActions
        busy={busy}
        enabled={enabled}
        hasStoredCredentials={settings.hasStoredCredentials}
        onSave={() => void save()}
        onTestConnection={() => void testConnection()}
        onRefreshCache={() => void refreshCache()}
        onClearCredentials={() => void clearCredentials()}
      />
      <GremiaBrSettingsMeta settings={settings} cache={cache} />
    </section>
  );
}
