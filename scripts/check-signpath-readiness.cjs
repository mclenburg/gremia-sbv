#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const REQUIRED_ENVIRONMENT = [
  'SIGNPATH_API_TOKEN',
  'SIGNPATH_ORGANIZATION_ID',
  'SIGNPATH_PROJECT_SLUG',
  'SIGNPATH_SIGNING_POLICY_SLUG',
];

const REQUIRED_FILES = {
  workflow: join('.github', 'workflows', 'signpath-windows-exe.yml'),
  artifactConfiguration: join('.signpath', 'artifact-configurations', 'windows-exe.xml'),
};

function readProjectFile(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function missingRequiredEnvironment(env) {
  return REQUIRED_ENVIRONMENT.filter((name) => !String(env[name] ?? '').trim());
}

function validateWorkflowContract(workflowText) {
  const hasManualTrigger = /^\s*workflow_dispatch:/m.test(workflowText);
  const hasAutomaticTrigger = /^\s*(push|pull_request|schedule):/m.test(workflowText);
  const isExplicitlyGated = workflowText.includes("vars.SIGNPATH_ENABLED == 'true'");
  const uploadsGitHubArtifact = workflowText.includes('actions/upload-artifact@v7');
  const submitsToSignPath = workflowText.includes('signpath/github-action-submit-signing-request@v2');
  const usesReadOnlyPermissions = workflowText.includes('actions: read') && workflowText.includes('contents: read');

  return {
    ok: hasManualTrigger && !hasAutomaticTrigger && isExplicitlyGated && uploadsGitHubArtifact && submitsToSignPath && usesReadOnlyPermissions,
    hasManualTrigger,
    hasAutomaticTrigger,
    isExplicitlyGated,
    uploadsGitHubArtifact,
    submitsToSignPath,
    usesReadOnlyPermissions,
  };
}

function validateArtifactConfiguration(artifactConfigurationText) {
  const hasZipRoot = artifactConfigurationText.includes('<zip-file>');
  const signsExe = artifactConfigurationText.includes('path="*.exe"') && artifactConfigurationText.includes('<authenticode-sign');
  const requiresAtLeastOneExe = artifactConfigurationText.includes('min-matches="1"');
  const doesNotSignUnexpectedContainers = !artifactConfigurationText.includes('<msi-file') && !artifactConfigurationText.includes('<xml-sign');

  return {
    ok: hasZipRoot && signsExe && requiresAtLeastOneExe && doesNotSignUnexpectedContainers,
    hasZipRoot,
    signsExe,
    requiresAtLeastOneExe,
    doesNotSignUnexpectedContainers,
  };
}

function validateReadiness({ env = process.env, workflowText, artifactConfigurationText, checkEnvironment = false } = {}) {
  const workflow = validateWorkflowContract(workflowText ?? readProjectFile(REQUIRED_FILES.workflow));
  const artifactConfiguration = validateArtifactConfiguration(
    artifactConfigurationText ?? readProjectFile(REQUIRED_FILES.artifactConfiguration),
  );
  const missingEnvironment = checkEnvironment ? missingRequiredEnvironment(env) : [];

  return {
    ok: workflow.ok && artifactConfiguration.ok && missingEnvironment.length === 0,
    workflow,
    artifactConfiguration,
    missingEnvironment,
  };
}

function assertRequiredFilesExist() {
  return Object.values(REQUIRED_FILES).filter((relativePath) => !existsSync(join(process.cwd(), relativePath)));
}

function main() {
  const missingFiles = assertRequiredFilesExist();
  if (missingFiles.length > 0) {
    console.error(`SignPath-Konfiguration unvollständig. Fehlende Dateien: ${missingFiles.join(', ')}`);
    process.exit(1);
  }

  const result = validateReadiness({ checkEnvironment: process.argv.includes('--env') });
  if (!result.ok) {
    if (result.missingEnvironment.length > 0) {
      console.error(`SignPath-Konfiguration unvollständig. Fehlende Umgebungswerte: ${result.missingEnvironment.join(', ')}`);
    }
    if (!result.workflow.ok) {
      console.error('SignPath-Workflow verletzt den Kosten- oder Sicherheitsvertrag.');
    }
    if (!result.artifactConfiguration.ok) {
      console.error('SignPath-Artefaktkonfiguration signiert nicht strikt die erwarteten Windows-EXE-Artefakte.');
    }
    process.exit(1);
  }

  console.log('SignPath-Readiness OK.');
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_ENVIRONMENT,
  REQUIRED_FILES,
  missingRequiredEnvironment,
  validateArtifactConfiguration,
  validateReadiness,
  validateWorkflowContract,
};
