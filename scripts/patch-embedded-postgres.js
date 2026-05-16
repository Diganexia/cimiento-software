/**
 * Patches @embedded-postgres/windows-x64/dist/index.js so that in production
 * Electron (where import.meta.url resolves to an ASAR virtual path), the binary
 * paths redirect to app.asar.unpacked where the real executables live.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@embedded-postgres', 'windows-x64', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('patch-embedded-postgres: target not found, skipping.');
  process.exit(0);
}

const patched = `import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);
// In production Electron, import.meta.url resolves to the ASAR virtual path.
// Redirect to app.asar.unpacked where the real executables live.
if (__filename.includes('app.asar') && process.resourcesPath) {
  __dirname = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@embedded-postgres', 'windows-x64', 'dist');
}
export const pg_ctl = path.resolve(__dirname, '..', 'native', 'bin', 'pg_ctl.exe');
export const initdb = path.resolve(__dirname, '..', 'native', 'bin', 'initdb.exe');
export const postgres = path.resolve(__dirname, '..', 'native', 'bin', 'postgres.exe');
`;

const current = fs.readFileSync(target, 'utf-8');
if (current === patched) {
  console.log('patch-embedded-postgres: already patched.');
  process.exit(0);
}

fs.writeFileSync(target, patched);
console.log('patch-embedded-postgres: applied successfully.');
