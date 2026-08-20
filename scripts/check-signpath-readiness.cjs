#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { load: parseYaml } = require('js-yaml');

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
  const workflow = parseYaml(workflowText);
  const triggers = workflow?.on ?? {};
  const jobs = workflow?.jobs ?? {};
  const jobEntries = Object.entries(jobs);
  const steps = jobEntries.flatMap(([, job]) => Array.isArray(job?.steps) ? job.steps : []);
  const actionName = (step) => typeof step?.uses === 'string' ? step.uses.split('@')[0] : undefined;
  const hasManualTrigger = Object.hasOwn(triggers, 'workflow_dispatch');
  const hasAutomaticTrigger = ['push', 'pull_request', 'schedule'].some((trigger) => Object.hasOwn(triggers, trigger));
  const isExplicitlyGated = jobEntries.every(([, job]) => String(job?.if ?? '').includes("vars.SIGNPATH_ENABLED == 'true'"));
  const uploadsGitHubArtifact = steps.some((step) => actionName(step) === 'actions/upload-artifact');
  const submitsToSignPath = steps.some((step) => actionName(step) === 'signpath/github-action-submit-signing-request');
  const usesReadOnlyPermissions = workflow?.permissions?.actions === 'read' && workflow?.permissions?.contents === 'read';
  const prepareJob = jobs['prepare-unsigned'];
  const signingJob = jobs['signpath-windows-exe'];
  const buildAndSigningSeparated = Boolean(prepareJob && signingJob && signingJob.needs === 'prepare-unsigned');
  const secret = '${{ secrets.SIGNPATH_API_TOKEN }}';
  const secretPaths = [];
  const visit = (value, path = []) => {
    if (value === secret) secretPaths.push(path.join('.'));
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, [...path, String(index)]));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, [...path, key]));
  };
  visit(workflow);
  const signingSteps = Array.isArray(signingJob?.steps) ? signingJob.steps : [];
  const submitIndex = signingSteps.findIndex((step) => actionName(step) === 'signpath/github-action-submit-signing-request');
  const secretIsStepScoped = secretPaths.length === 1
    && secretPaths[0] === `jobs.signpath-windows-exe.steps.${submitIndex}.with.api-token`;
  const actionsPinned = steps.filter((step) => typeof step?.uses === 'string')
    .every((step) => /^[^@]+@[0-9a-f]{40}$/i.test(step.uses));

  return {
    ok: hasManualTrigger && !hasAutomaticTrigger && isExplicitlyGated && uploadsGitHubArtifact && submitsToSignPath
      && usesReadOnlyPermissions && buildAndSigningSeparated && secretIsStepScoped && actionsPinned,
    hasManualTrigger,
    hasAutomaticTrigger,
    isExplicitlyGated,
    uploadsGitHubArtifact,
    submitsToSignPath,
    usesReadOnlyPermissions,
    buildAndSigningSeparated,
    secretIsStepScoped,
    actionsPinned,
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
