// main.ts — hands the entry in. It copies app/ and screenshots/ to the output
// directory and writes dossier.json there with the vendored library
// (vendor/makefun-frontend.ts, the kit's copy, unchanged — the scorer rebuilds
// the dossier with its own copy and compares byte for byte).
//
// Determinism is checked, not assumed: the whole build runs twice into two
// scratch directories and the two dossier.json files are hashed; if they
// differ, the program refuses (exit 1) and nothing is handed in.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function buildInto(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(here, 'app'), join(dir, 'app'), { recursive: true });
  mkdirSync(join(dir, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(dir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(dir, 'dossier.json'), buildDossier(dir, GATE_LIMITS));
  return readFileSync(join(dir, 'dossier.json'));
}

const scratchA = join(tmpdir(), 'mf-v11c-build-a');
const scratchB = join(tmpdir(), 'mf-v11c-build-b');
const first = buildInto(scratchA);
const second = buildInto(scratchB);
const shaA = createHash('sha256').update(first).digest('hex');
const shaB = createHash('sha256').update(second).digest('hex');
if (shaA !== shaB) {
  console.error('refusing: two builds differ (' + shaA + ' vs ' + shaB + ')');
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(scratchA, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(scratchA, 'screenshots'), join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), first);

// Read the handed-in file back and hash it: what is on disk must be the bytes
// the two builds agreed on, or the hand-in is refused here rather than later.
const onDisk = readFileSync(join(out, 'dossier.json'));
const shaDisk = createHash('sha256').update(onDisk).digest('hex');
if (shaDisk !== shaA) {
  console.error('refusing: dossier.json on disk hashes to ' + shaDisk + ', not ' + shaA);
  process.exit(1);
}

const text = JSON.parse(first.toString('utf8')).text || '';
const totals = text.split('\n').map((l) => l.trim()).find((l) => l.startsWith('Totals:'));
console.log('main.ts: wrote ' + first.length + ' bytes of dossier.json to ' + out + ' (two builds, identical)');
console.log('main.ts: dossier sha256 ' + shaA);
if (totals) console.log(totals);
