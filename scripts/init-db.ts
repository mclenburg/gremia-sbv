import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve('database/schema.sql');
const seedPath = path.resolve('database/seed/legal-references.sql');

console.log('Gremia.SBV DB-Initialisierung');
console.log(`Schema: ${schemaPath}`);
console.log(`Seed:   ${seedPath}`);

if (!fs.existsSync(schemaPath)) {
  throw new Error('database/schema.sql fehlt.');
}

console.log('Dieses Skript ist ein Platzhalter. Die echte Initialisierung erfolgt nach finaler SQLCipher-Adapterwahl.');
