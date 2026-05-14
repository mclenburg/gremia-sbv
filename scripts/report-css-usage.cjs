#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const cssRoots = [path.join(projectRoot, 'src', 'app')];
const usageRoots = [path.join(projectRoot, 'src', 'app'), path.join(projectRoot, 'docs'), path.join(projectRoot, 'e2e')];

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute, predicate);
    return entry.isFile() && predicate(absolute) ? [absolute] : [];
  });
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function relative(file) {
  return path.relative(projectRoot, file).split(path.sep).join('/');
}

const cssFiles = cssRoots.flatMap((root) => walk(root, (file) => file.endsWith('.css')));
const usageFiles = usageRoots.flatMap((root) => walk(root, (file) => /\.(ts|tsx|js|jsx|html|md)$/.test(file)));
const usageText = usageFiles.map(read).join('\n');
const classPattern = /\.([_a-zA-Z][_a-zA-Z0-9-]*)(?=[\s.#:[,{>+~])/g;
const classes = new Map();

for (const file of cssFiles) {
  const source = read(file);
  for (const match of source.matchAll(classPattern)) {
    const className = match[1];
    const files = classes.get(className) ?? new Set();
    files.add(relative(file));
    classes.set(className, files);
  }
}

const unused = [...classes.keys()]
  .filter((className) => !usageText.includes(className))
  .sort();

console.log(`CSS-Audit: ${classes.size} Klassen definiert, ${unused.length} ohne direkte statische Nutzung.`);
if (unused.length > 0) {
  console.log(unused.map((className) => `- ${className} (${[...classes.get(className)].join(', ')})`).join('\n'));
}
