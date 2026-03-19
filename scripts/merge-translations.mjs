#!/usr/bin/env node
/**
 * Merge official VS Code translation keys into translations.xlsx.
 *
 * Usage:
 *   node scripts/merge-translations.mjs
 *
 * What it does:
 *   1. Reads translations.xlsx  (preserves all existing translations)
 *   2. Reads vscode_translations_fr.json  → fills "french" reference column
 *   3. Reads vscode_translations_zh.json  → fills "chinese" reference column
 *   4. Adds every official VS Code key not yet in the workbook
 *   5. Backfills french/chinese on pre-existing rows that are missing them
 *   6. Writes the updated translations.xlsx
 *
 * Fetch reference files first:
 *   node scripts/fetch-references.mjs
 *
 * Column layout:
 *   module, key, english, french, chinese  ← reference (not compiled)
 *   punjabi, hindi                         ← output (compiled to JSON)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readXLSX, writeXLSX, HEADERS } from './xlsx-utils.mjs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const REFERENCES = resolve(ROOT, '..', 'references');
const XLSX_PATH  = join(REFERENCES, 'translations.xlsx');

const REF_SOURCES = [
  { col: 'french',  file: join(REFERENCES, 'vscode_translations_fr.json') },
  { col: 'chinese', file: join(REFERENCES, 'vscode_translations_zh.json') },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // 1. Load existing workbook
  let rows = [];
  if (existsSync(XLSX_PATH)) {
    console.log(`Reading ${XLSX_PATH}...`);
    rows = readXLSX(XLSX_PATH);
    console.log(`  Existing rows: ${rows.length}`);
  } else {
    console.log('translations.xlsx not found — creating from scratch.');
  }

  const rowIndex = new Map(rows.map((r) => [`${r.module}|||${r.key}`, r]));

  // 2. Load reference sources
  const refs = [];
  for (const { col, file } of REF_SOURCES) {
    if (!existsSync(file)) { console.log(`  ${col}: not found (${file}) — skipping`); continue; }
    const data     = JSON.parse(readFileSync(file, 'utf-8'));
    const keyCount = Object.values(data).reduce((s, m) => s + Object.keys(m).length, 0);
    console.log(`  Loaded ${col}: ${Object.keys(data).length} modules, ${keyCount} keys`);
    refs.push({ col, data });
  }

  if (refs.length === 0) {
    console.error('No reference files found. Fetch them first (see scripts/fetch-references.mjs).');
    process.exit(1);
  }

  // Use first ref as the master key list
  const master     = refs[0].data;
  const allModules = Object.keys(master).sort();

  // 3. Merge
  let added    = 0;
  let refFilled = 0;

  for (const mod of allModules) {
    for (const key of Object.keys(master[mod]).sort()) {
      const id  = `${mod}|||${key}`;
      let   row = rowIndex.get(id);

      if (!row) {
        row = Object.fromEntries(HEADERS.map((h) => [h, '']));
        row.module = mod;
        row.key    = key;
        rows.push(row);
        rowIndex.set(id, row);
        added++;
      }

      // Backfill reference columns
      for (const { col, data } of refs) {
        if (!row[col] && data[mod]?.[key]) { row[col] = data[mod][key]; refFilled++; }
      }
    }
  }

  // Backfill references on rows not in master (custom / pre-existing strings)
  for (const row of rows) {
    for (const { col, data } of refs) {
      if (!row[col] && data[row.module]?.[row.key]) { row[col] = data[row.module][row.key]; refFilled++; }
    }
  }

  // 4. Write XLSX
  writeXLSX(XLSX_PATH, rows);

  // 5. Summary
  const validRows = rows.filter((r) => r.module && r.key);
  console.log(`\nUpdated ${XLSX_PATH}`);
  console.log(`  Total rows:        ${rows.length}`);
  console.log(`  New keys added:    ${added}`);
  console.log(`  Reference filled:  ${refFilled}`);
  console.log('\nTranslation coverage:');
  ['punjabi', 'hindi'].forEach((lang) => {
    const count = validRows.filter((r) => r[lang]).length;
    const pct   = ((count / validRows.length) * 100).toFixed(1);
    console.log(`  ${lang.padEnd(12)}: ${count.toString().padStart(6)} / ${validRows.length}  (${pct}%)`);
  });
  console.log('\nOpen translations.xlsx in a spreadsheet editor and fill in punjabi / hindi columns.');
  console.log('Then run: npm run translations:build');
}

main();
