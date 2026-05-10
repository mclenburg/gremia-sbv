#!/usr/bin/env node
const { rmSync, existsSync } = require('node:fs');
const obsolete = [
  'docs/RELEASE_NOTES_0.9.0-rc.1-b.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-c.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-d.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-e.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-f.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-g.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-h.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-i.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-j.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-k.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-l.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-m.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-o.md',
  'docs/RELEASE_NOTES_0.9.0-rc.1-p.md'
];
for (const file of obsolete) {
  if (existsSync(file)) rmSync(file);
}
console.log(`Obsolete RC release notes removed: ${obsolete.length}`);
