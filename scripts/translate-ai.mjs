#!/usr/bin/env node
/**
 * AI-powered translation using the Claude API (streaming, interactive).
 *
 * Usage:
 *   node scripts/translate-ai.mjs --lang punjabi
 *   node scripts/translate-ai.mjs --lang hindi --limit 200
 *   node scripts/translate-ai.mjs --lang punjabi --batch-size 30 --model claude-haiku-4-5
 *   node scripts/translate-ai.mjs --lang punjabi --dry-run
 *
 * Options:
 *   --lang        punjabi | hindi  (required)
 *   --limit       max strings to translate (default: all untranslated)
 *   --batch-size  strings per API call (default: 50)
 *   --model       claude model ID (default: claude-haiku-4-5-20251001)
 *   --dry-run     show what would be translated without calling the API
 *   --help        show this help
 *
 * Reads:   translations.xlsx
 * Writes:  translations.xlsx (after every batch — safe to interrupt and resume)
 */

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import Anthropic from '@anthropic-ai/sdk';
import { readXLSX, writeXLSX } from './xlsx-utils.mjs';

const require = createRequire(import.meta.url);
const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const REFERENCES = resolve(ROOT, 'references');
const XLSX_PATH  = join(REFERENCES, 'translations.xlsx');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scripts/translate-ai.mjs --lang <punjabi|hindi> [options]

Options:
  --lang <lang>         Target language column (punjabi or hindi) [required]
  --limit <n>           Max strings to translate in this run (default: all)
  --batch-size <n>      Strings per API call (default: 50)
  --model <id>          Claude model ID (default: claude-haiku-4-5-20251001)
  --dry-run             Show what would be sent without calling the API
  --help                Show this help
`);
  process.exit(0);
}

function getArg(flag, defaultVal) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : defaultVal;
}

const LANG       = getArg('--lang', null);
const LIMIT      = parseInt(getArg('--limit', '0'), 10);
const BATCH_SIZE = parseInt(getArg('--batch-size', '50'), 10);
const MODEL      = getArg('--model', 'claude-haiku-4-5-20251001');
const DRY_RUN    = args.includes('--dry-run');

const LANG_LABELS = {
  punjabi: 'Punjabi (ਪੰਜਾਬੀ)',
  hindi:   'Hindi (हिन्दी)',
};

if (!LANG || !LANG_LABELS[LANG]) {
  console.error('Error: --lang must be "punjabi" or "hindi"');
  process.exit(1);
}

// ─── Translation prompt ────────────────────────────────────────────────────────

function buildPrompt(lang, items) {
  const langLabel = LANG_LABELS[lang];
  const examples = items
    .map((item, i) => {
      const refs = [];
      if (item.english) refs.push(`English: "${item.english}"`);
      if (item.french)  refs.push(`French: "${item.french}"`);
      if (item.chinese) refs.push(`Chinese: "${item.chinese}"`);
      return `${i + 1}. ${refs.join(' | ')}`;
    })
    .join('\n');

  return `You are a professional software localizer specializing in UI translations for VS Code (a code editor).

Translate the following ${items.length} VS Code UI strings into ${langLabel}.

Rules:
- Keep translations concise — these are menu items, buttons, tooltips, and labels
- Preserve any placeholders like {0}, {1}, %s, %d, {name}, etc. exactly as-is
- Preserve markdown formatting like **bold**, \`code\`, and links
- Use formal register appropriate for software interfaces
- If a term has no natural translation, use the English word (e.g. "Debug", "Terminal")
- Return ONLY a JSON array of translated strings, one per input, in the same order
- Do not add any explanation, commentary, or markdown code block

Input strings:
${examples}

Return a JSON array with exactly ${items.length} strings.`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function translateBatch(client, lang, items) {
  const prompt = buildPrompt(lang, items);

  let fullText = '';
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }

  // Parse the JSON array from the response
  const match = fullText.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Could not find JSON array in response:\n${fullText}`);
  const translations = JSON.parse(match[0]);
  if (!Array.isArray(translations) || translations.length !== items.length) {
    throw new Error(`Expected ${items.length} translations, got ${translations.length}`);
  }
  return translations;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌐 AI Translation — ${LANG_LABELS[LANG]}`);
  console.log(`   Model:      ${MODEL}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  if (LIMIT > 0) console.log(`   Limit:      ${LIMIT}`);
  if (DRY_RUN) console.log('   Mode:       DRY RUN (no API calls)\n');

  console.log(`\nReading ${XLSX_PATH}...`);
  const rows = readXLSX(XLSX_PATH);

  // Find untranslated rows
  let todo = rows.filter((r) => r.module && r.key && !r[LANG]);
  console.log(`  Total rows:       ${rows.length}`);
  console.log(`  Already done:     ${rows.filter((r) => r.module && r.key && r[LANG]).length}`);
  console.log(`  Untranslated:     ${todo.length}`);

  if (LIMIT > 0) {
    todo = todo.slice(0, LIMIT);
    console.log(`  Will translate:   ${todo.length} (limited by --limit)`);
  } else {
    console.log(`  Will translate:   ${todo.length}`);
  }

  if (todo.length === 0) {
    console.log('\n✅ Nothing to translate!');
    return;
  }

  // Batch index for fast updates
  const rowIndex = new Map(rows.map((r) => [`${r.module}|||${r.key}`, r]));

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: first batch would contain ---');
    const sample = todo.slice(0, Math.min(BATCH_SIZE, 5));
    for (const item of sample) {
      console.log(`  [${item.module}] ${item.key}`);
      if (item.english) console.log(`    EN: ${item.english.slice(0, 80)}`);
    }
    if (todo.length > 5) console.log(`  ... and ${todo.length - 5} more`);
    console.log(`\nWould make ${Math.ceil(todo.length / BATCH_SIZE)} API calls.`);
    return;
  }

  const client = new Anthropic();
  const batches = Math.ceil(todo.length / BATCH_SIZE);

  let translated = 0;
  let failed     = 0;

  for (let b = 0; b < batches; b++) {
    const batch = todo.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    process.stdout.write(`  Batch ${(b + 1).toString().padStart(3)} / ${batches}  (${batch.length} strings) ... `);

    try {
      const results = await translateBatch(client, LANG, batch);

      // Write translations back to row index
      for (let i = 0; i < batch.length; i++) {
        const id  = `${batch[i].module}|||${batch[i].key}`;
        const row = rowIndex.get(id);
        if (row) row[LANG] = results[i];
      }
      translated += batch.length;
      process.stdout.write(`✓\n`);
    } catch (err) {
      process.stdout.write(`✗  (${err.message.slice(0, 60)})\n`);
      failed += batch.length;
    }

    // Save after every batch — safe to interrupt
    writeXLSX(XLSX_PATH, rows);
  }

  console.log(`\n✅ Done.`);
  console.log(`   Translated: ${translated}`);
  if (failed > 0) console.log(`   Failed:     ${failed} (retry by running again)`);
  console.log(`\nRun \`npm run translations:build\` to regenerate extension JSON files.`);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
