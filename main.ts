// main.ts — hands the entry in: copies app/ and screenshots/ beside this
// file into the output directory and writes dossier.json there, the
// summary the judge reads, built with the vendored make.fun library.
//
// The dossier is built twice from the same staged tree and the two
// hashes compared: an entry whose summary changes between builds is
// refused here, by this program, before anyone else has to refuse it.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (MAKEFUN_OUTPUT_DIR stands in for the grader's /output.)

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, as the kit names them.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function stage(target: string): void {
  mkdirSync(target, { recursive: true });
  cpSync(join(here, 'app'), join(target, 'app'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    mkdirSync(join(target, 'screenshots'), { recursive: true });
    cpSync(join(here, 'screenshots'), join(target, 'screenshots'), { recursive: true });
  }
}

function build(target: string): Buffer {
  const made = buildDossier(target, LIMITS);
  return typeof made === 'string' ? Buffer.from(made) : Buffer.from(made as Uint8Array);
}

stage(out);
const first = build(out);
const second = build(out);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

if (sha(first) !== sha(second)) {
  console.error('main.ts: dossier is not deterministic — two builds differ; refusing to hand in');
  process.exit(1);
}

writeFileSync(join(out, 'dossier.json'), first);
const shots = existsSync(join(here, 'screenshots'))
  ? ['1-board.jpg', '2-leaderboard.jpg', '3-profile.jpg'].filter((f) => existsSync(join(here, 'screenshots', f))).length
  : 0;
console.log(`main.ts: wrote ${first.length} bytes of dossier.json to ${out} (two builds, identical, sha256 ${sha(first)}; ${shots} screenshots handed in)`);
