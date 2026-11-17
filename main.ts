// main.ts — hands the entry in. Copies app/ and screenshots/ into the
// output directory and writes dossier.json with the kit's own library.
// The dossier is built twice and the two builds must agree byte for
// byte; a non-deterministic dossier is refused, never written.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16_777_216,
};

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const first = buildDossier(out, CAPS);
const second = buildDossier(out, CAPS);
const firstHash = createHash('sha256').update(first).digest('hex');
const secondHash = createHash('sha256').update(second).digest('hex');
if (firstHash !== secondHash) {
  throw new Error('dossier build is not deterministic: two runs differ');
}
writeFileSync(join(out, 'dossier.json'), first);

console.log(`main.ts: wrote ${first.length} bytes of dossier.json to ${out} (two builds, identical)`);
console.log(`main.ts: dossier sha256 ${firstHash}`);
