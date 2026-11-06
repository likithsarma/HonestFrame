// Static checks for the extension: every file the manifest points at exists,
// every JS file parses, and the permissions stay minimal.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const problems = [];

const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...(manifest.content_scripts ?? []).flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
].filter(Boolean);

for (const f of referenced) {
  if (!existsSync(join(root, f))) problems.push(`manifest references missing file: ${f}`);
}

if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');

const allowedPerms = new Set(['storage']);
for (const p of manifest.permissions ?? []) {
  if (!allowedPerms.has(p)) problems.push(`unexpected permission: ${p}`);
}
for (const h of manifest.host_permissions ?? []) {
  if (!/^https:\/\/(www\.youtube\.com|\*\.ytimg\.com)\/\*$/.test(h)) problems.push(`unexpected host permission: ${h}`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const jsFiles = walk(join(root, 'src')).filter((p) => p.endsWith('.js'));
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', '--input-type=module', '-'], {
      input: readFileSync(f, 'utf8'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    problems.push(`syntax error in ${f}: ${e.stderr?.toString().split('\n')[0] ?? e.message}`);
  }
}

if (problems.length) {
  console.error(problems.map((p) => '✗ ' + p).join('\n'));
  process.exit(1);
}
console.log(`✓ manifest OK, ${referenced.length} referenced files present, ${jsFiles.length} JS files parse`);
