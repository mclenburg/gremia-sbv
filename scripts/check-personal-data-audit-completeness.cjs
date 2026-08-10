#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const DEFAULT_CONFIG = path.join('maintenance', 'architecture', 'personal-data-audit-classification.json');
const MUTATION_PATTERN = /\b(INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function walkTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkTypeScriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

function methodHasDirectAudit(bodyText) {
  return /\bthis\s*\.\s*audit\s*\(/.test(bodyText)
    || /\b(?:auditLog|audit)\s*\.\s*append\s*\(/.test(bodyText)
    || /\blifecycleAudit\s*\.\s*(?:created|statusChanged|completed|cancelled|reopened|deleted)\s*\(/.test(bodyText)
    || /new\s+(?:PersonalDataAuditLogService|CaseLifecycleAuditService|MeasureLifecycleAuditService)\s*\([^)]*\)\s*\.\s*\w+\s*\(/s.test(bodyText);
}

function mutationActions(bodyText, personalTables) {
  const actions = new Set();
  const tables = new Set();
  let match;
  MUTATION_PATTERN.lastIndex = 0;
  while ((match = MUTATION_PATTERN.exec(bodyText))) {
    const table = match[2];
    if (!personalTables.has(table)) continue;
    tables.add(table);
    const operation = match[1].toUpperCase();
    if (operation.startsWith('INSERT')) actions.add('create');
    else if (operation === 'UPDATE') actions.add('update');
    else if (operation.startsWith('DELETE')) actions.add('delete');
  }
  return { actions: [...actions].sort(), tables: [...tables].sort() };
}

function discoverPersonalMutations(root, config) {
  const personalTables = new Set(config.personalTables);
  const servicesRoot = path.join(root, 'services');
  const found = [];
  for (const file of walkTypeScriptFiles(servicesRoot)) {
    const sourceText = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
    let className = '<module>';
    const visit = (node) => {
      if (ts.isClassDeclaration(node)) {
        const previous = className;
        className = node.name?.text ?? '<anonymous>';
        ts.forEachChild(node, visit);
        className = previous;
        return;
      }
      if (ts.isMethodDeclaration(node) && node.body && node.name) {
        const bodyText = node.body.getText(sourceFile);
        const mutation = mutationActions(bodyText, personalTables);
        if (mutation.tables.length) {
          found.push({
            key: `${normalizePath(path.relative(root, file))}#${className}.${node.name.getText(sourceFile)}`,
            file: normalizePath(path.relative(root, file)),
            className,
            methodName: node.name.getText(sourceFile),
            actions: mutation.actions,
            tables: mutation.tables,
            directAudit: methodHasDirectAudit(bodyText),
          });
        }
      }
      if (className === '<module>' && ts.isFunctionDeclaration(node) && node.body && node.name) {
        const bodyText = node.body.getText(sourceFile);
        const mutation = mutationActions(bodyText, personalTables);
        if (mutation.tables.length) {
          found.push({
            key: `${normalizePath(path.relative(root, file))}#<module>.${node.name.text}`,
            file: normalizePath(path.relative(root, file)),
            className: '<module>',
            methodName: node.name.text,
            actions: mutation.actions,
            tables: mutation.tables,
            directAudit: methodHasDirectAudit(bodyText),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return found.sort((a, b) => a.key.localeCompare(b.key));
}

function validateAuditCompleteness(root = process.cwd(), configPath = DEFAULT_CONFIG) {
  const config = JSON.parse(fs.readFileSync(path.join(root, configPath), 'utf8'));
  const discovered = discoverPersonalMutations(root, config);
  const exceptions = config.exceptions ?? {};
  const violations = [];
  const discoveredKeys = new Set(discovered.map((entry) => entry.key));

  for (const entry of discovered) {
    if (entry.directAudit) continue;
    const exception = exceptions[entry.key];
    if (!exception) {
      violations.push(`${entry.key}: personenbezogene Mutation (${entry.actions.join('/')}; ${entry.tables.join(', ')}) ohne direkten Audit-Owner oder Klassifikation.`);
      continue;
    }
    if (!['delegated', 'derived', 'infrastructure'].includes(exception.classification)) {
      violations.push(`${entry.key}: ungültige Klassifikation ${String(exception.classification)}.`);
    }
    if (!String(exception.reason ?? '').trim()) {
      violations.push(`${entry.key}: Klassifikation benötigt eine Begründung.`);
    }
    if (exception.classification !== 'infrastructure' && !String(exception.owner ?? '').trim()) {
      violations.push(`${entry.key}: ${exception.classification} benötigt einen Audit-Owner.`);
    }
  }

  for (const key of Object.keys(exceptions)) {
    if (!discoveredKeys.has(key)) violations.push(`${key}: veraltete Audit-Ausnahme; keine passende personenbezogene Mutation mehr gefunden.`);
  }

  return { config, discovered, violations };
}

if (require.main === module) {
  const result = validateAuditCompleteness();
  if (result.violations.length) {
    console.error('Audit-Vollständigkeitsvertrag verletzt:');
    result.violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
  }
  const directlyAudited = result.discovered.filter((entry) => entry.directAudit).length;
  const classified = result.discovered.length - directlyAudited;
  console.log(`Audit-Vollständigkeit OK: ${result.discovered.length} personenbezogene Mutationsmethoden, ${directlyAudited} direkt auditiert, ${classified} explizit klassifiziert.`);
}

module.exports = {
  discoverPersonalMutations,
  methodHasDirectAudit,
  mutationActions,
  validateAuditCompleteness,
};
