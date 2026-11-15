// Builds the built-in paint catalog src/catalog/catalog.json from github.com/Arcturus5404/miniature-paints (MIT,
// © Rick Fleuren / Miniature Painter Pro) at a fixed commit, so the result does not change by itself.
//   npm run build-catalog
// Moving to a newer commit: change COMMIT, run, look at the diff of catalog.json.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeHex } from '../src/shared/colors.ts';
import type { CatalogFile } from '../src/shared/catalog.ts';

const REPO = 'Arcturus5404/miniature-paints';
const COMMIT = '22791a682e1d155da388f4f856cd7196cd9f2677';
const OUT = path.resolve('src/catalog');

// File names → brand names as painters write them (and as the rack of 0.6 had them).
const NAMES: Record<string, string> = {
  AKRC: 'AK Real Colors', AppleBarrel: 'Apple Barrel', Army_Painter: 'Army Painter', Citadel_Colour: 'Citadel',
  CoatDArmes: "Coat d'Arms", FolkArt: 'FolkArt', GreenStuffWorld: 'Green Stuff World', KimeraKolors: 'Kimera Kolors',
  Mig: 'MIG', MissionModels: 'Mission Models', MrHobby: 'Mr. Hobby', MrPaint: 'Mr. Paint', TomColor: 'Tom Color',
  TurboDork: 'Turbo Dork',
};

const raw = (file: string) => `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${file}`;
async function get(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();

// A brand file: a markdown table whose header names the columns (Name, Code?, Set, R, G, B, Hex).
function parse(md: string): [string, string, string, string][] {
  const lines = md.split('\n').filter((l) => l.startsWith('|'));
  const header = lines.find((l) => l.startsWith('|Name'));
  if (!header) return [];
  const cols = header.split('|').slice(1, -1).map((c) => c.trim().toLowerCase());
  const at = (c: string) => cols.indexOf(c);
  const rows: [string, string, string, string][] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    if (l === header || l.startsWith('|---') || l.startsWith('| :')) continue;
    const cells = l.split('|').slice(1, -1);
    const name = decode(cells[at('name')] ?? '');
    const line = decode(cells[at('set')] ?? '').replace(/^null$/i, '');
    const code = at('code') >= 0 ? decode(cells[at('code')] ?? '').replace(/^null$/i, '') : '';
    const hex = normalizeHex(/#([0-9a-fA-F]{6})/.exec(cells[at('hex')] ?? '')?.[0]);
    if (!name || !hex) continue;
    const id = `${name}|${line}|${code}`.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push([name, line, code, hex]);
  }
  return rows;
}

const list = JSON.parse(await get(`https://api.github.com/repos/${REPO}/contents/paints?ref=${COMMIT}`)) as { name: string }[];
const out: CatalogFile = {
  source: { repo: `https://github.com/${REPO}`, commit: COMMIT, license: 'MIT', author: 'Rick Fleuren (Miniature Painter Pro)' },
  brands: [],
};
for (const { name } of list.filter((f) => f.name.endsWith('.md'))) {
  const file = name.replace(/\.md$/, '');
  const rows = parse(await get(raw(`paints/${name}`)));
  if (rows.length) out.brands.push({ name: NAMES[file] ?? file, rows });
}
out.brands.sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(OUT, { recursive: true });
// One brand per line: small diffs when the source changes.
const json = `{"source":${JSON.stringify(out.source)},"brands":[\n${out.brands.map((b) => JSON.stringify(b)).join(',\n')}\n]}\n`;
fs.writeFileSync(path.join(OUT, 'catalog.json'), json);
fs.writeFileSync(path.join(OUT, 'LICENSE'), (await get(raw('LICENSE'))).trim() + `\n\nSource: https://github.com/${REPO} (commit ${COMMIT})\n`);
const total = out.brands.reduce((s, b) => s + b.rows.length, 0);
console.log(`${out.brands.length} brands, ${total} paints → ${path.join(OUT, 'catalog.json')} (${(json.length / 1024).toFixed(0)} KB)`);
