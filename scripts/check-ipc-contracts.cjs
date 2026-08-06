#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const channelsSource = fs.readFileSync(path.join(root, 'electron/ipc/channels.ts'), 'utf8');
const contractsPath = path.join(root, 'electron/ipc/contracts.ts');
const contractsSource = fs.readFileSync(contractsPath, 'utf8');
const declared = new Map([...channelsSource.matchAll(/^\s*([A-Za-z0-9_]+):\s*"([^"]+)",$/gm)].map((match) => [match[1], match[2]]));
const handlerFiles = fs.readdirSync(path.join(root, 'electron/ipc')).filter((name) => name.endsWith('Ipc.ts'));
const preloadFiles = fs.readdirSync(path.join(root, 'electron/preload')).filter((name) => name.endsWith('.ts'));

function collect(files, directory, pattern) {
  const result = new Map();
  for (const file of files) {
    const source = fs.readFileSync(path.join(directory, file), 'utf8');
    for (const match of source.matchAll(pattern)) {
      const key = match[1];
      const locations = result.get(key) ?? [];
      locations.push(file);
      result.set(key, locations);
    }
  }
  return result;
}

function calledFunctionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return `${expression.expression.text}.${expression.name.text}`;
  }
  return undefined;
}

function unwrapCall(expression, functionName) {
  return ts.isCallExpression(expression) && calledFunctionName(expression.expression) === functionName
    ? expression.arguments[0]
    : expression;
}

function propertyNameText(name) {
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isIdentifier(name)) return name.text;
  return undefined;
}

function findProperty(objectLiteral, propertyName) {
  return objectLiteral.properties.find((property) => ts.isPropertyAssignment(property) && propertyNameText(property.name) === propertyName);
}

function parseStringArray(node) {
  const arrayNode = unwrapCall(node, 'Object.freeze');
  if (!arrayNode || !ts.isArrayLiteralExpression(arrayNode)) return undefined;
  const values = [];
  for (const element of arrayNode.elements) {
    if (!ts.isStringLiteral(element)) return undefined;
    values.push(element.text);
  }
  return values;
}

function parseString(node) {
  return ts.isStringLiteral(node) ? node.text : undefined;
}

function parseBoolean(node) {
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function parseContracts() {
  const sourceFile = ts.createSourceFile(contractsPath, contractsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let contractsObject;

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'IPC_ENDPOINT_CONTRACTS' || !declaration.initializer) continue;
      const initializer = unwrapCall(declaration.initializer, 'Object.freeze');
      if (initializer && ts.isObjectLiteralExpression(initializer)) contractsObject = initializer;
    }
  }

  if (!contractsObject) throw new Error('IPC_ENDPOINT_CONTRACTS konnte nicht als Objektliteral gelesen werden.');

  const result = new Map();
  for (const property of contractsObject.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const channel = propertyNameText(property.name);
    if (!channel) continue;

    const contractExpression = unwrapCall(property.initializer, 'endpoint');
    const contractObject = unwrapCall(contractExpression, 'Object.freeze');
    if (!contractObject || !ts.isObjectLiteralExpression(contractObject)) continue;

    const argumentsProperty = findProperty(contractObject, 'arguments');
    const outputTypeProperty = findProperty(contractObject, 'outputType');
    const outputSchemaProperty = findProperty(contractObject, 'outputSchema');
    const rejectsPathsProperty = findProperty(contractObject, 'rejectsAbsoluteRendererPaths');
    const behaviorTestProperty = findProperty(contractObject, 'behaviorTest');

    if (!argumentsProperty || !outputTypeProperty || !outputSchemaProperty || !rejectsPathsProperty || !behaviorTestProperty) continue;

    const argumentsList = parseStringArray(argumentsProperty.initializer);
    const outputType = parseString(outputTypeProperty.initializer);
    const outputSchema = parseString(outputSchemaProperty.initializer);
    const rejectsAbsoluteRendererPaths = parseBoolean(rejectsPathsProperty.initializer);
    const behaviorTest = parseString(behaviorTestProperty.initializer);

    if (!argumentsList || outputType === undefined || outputSchema === undefined || rejectsAbsoluteRendererPaths === undefined || behaviorTest === undefined) continue;
    result.set(channel, { arguments: argumentsList, outputType, outputSchema, rejectsAbsoluteRendererPaths, behaviorTest });
  }
  return result;
}

const handlers = collect(handlerFiles, path.join(root, 'electron/ipc'), /registerIpcHandler\(ipcMain,\s*IPC_CHANNELS\.([A-Za-z0-9_]+)/g);
const preload = collect(preloadFiles, path.join(root, 'electron/preload'), /invokeIpc\(\s*IPC_CHANNELS\.([A-Za-z0-9_]+)/g);
const contracts = parseContracts();
const behaviorTestSource = fs.readFileSync(path.join(root, 'tests/ipcEndpointContractsCompletion.test.ts'), 'utf8');
const errors = [];
for (const [key, channel] of declared) {
  const contract = contracts.get(channel);
  if (!contract) errors.push(`Kein Ein-/Ausgabeschema für ${channel} (${key}).`);
  if (contract && contract.outputType.length === 0) errors.push(`Leeres Ausgabeschema für ${channel}.`);
  if (contract && contract.outputSchema !== 'structured-clone-value') errors.push(`Ungültiges Ausgabeschema für ${channel}: ${contract.outputSchema}.`);
  if (contract && contract.rejectsAbsoluteRendererPaths !== true) errors.push(`Pfadschutz ist für ${channel} nicht aktiviert.`);
  if (contract && !behaviorTestSource.includes(contract.behaviorTest)) errors.push(`Kein benannter Verhaltenstest für ${channel}: ${contract.behaviorTest}.`);
  if (!handlers.has(key)) errors.push(`Kein Main-Handler für ${channel} (${key}).`);
  if (!preload.has(key)) errors.push(`Keine Preload-Funktion für ${channel} (${key}).`);
  if ((handlers.get(key)?.length ?? 0) !== 1) errors.push(`Kanal ${channel} hat ${handlers.get(key)?.length ?? 0} Handler statt genau einem.`);
  if ((preload.get(key)?.length ?? 0) !== 1) errors.push(`Kanal ${channel} hat ${preload.get(key)?.length ?? 0} Preload-Aufrufe statt genau einem.`);
}
for (const channel of contracts.keys()) if (![...declared.values()].includes(channel)) errors.push(`Schema für nicht registrierten Kanal: ${channel}.`);
for (const key of new Set([...handlers.keys(), ...preload.keys()])) if (!declared.has(key)) errors.push(`Nicht deklarierter IPC-Schlüssel: ${key}.`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`IPC-Vertrag gültig: ${declared.size} Kanäle mit Handler, Preload-Aufruf, Ein-/Ausgabeschema und Verhaltenstest.`);
