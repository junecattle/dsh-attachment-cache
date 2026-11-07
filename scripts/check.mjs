/**
 * Syntax-checks both halves of the plugin as ES modules.
 *
 * `node --check file.js` parses as CommonJS regardless of package.json "type",
 * so each file is copied to a temp path with an extension that decides the
 * grammar, then checked.
 */

import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const targets = [
  ['index.js', '.mjs'],
  ['client.js', '.cjs'],
];

const work = await mkdtemp(join(tmpdir(), 'dsh-attachment-cache-check-'));
let failed = false;

try {
  for (const [file, ext] of targets) {
    const copy = join(work, file.replace(/\.js$/, ext));
    await copyFile(join(ROOT, file), copy);
    console.log(`checking ${file} ...`);
    // Inherited stdio: piped stdio is refused inside sandboxed harness runs.
    const result = spawnSync(process.execPath, ['--check', copy], { stdio: 'inherit' });
    if (result.status === 0) {
      console.log(`ok   ${file}`);
    } else {
      failed = true;
      console.error(`FAIL ${file}`);
    }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
