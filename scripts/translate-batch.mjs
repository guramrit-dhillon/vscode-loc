#!/usr/bin/env node
/**
 * AI-powered bulk translation using the Anthropic Batches API (50% cheaper).
 *
 * Unlike translate-ai.mjs (which streams and saves incrementally), this script
 * submits a single large batch job and polls until it completes. Best for full
 * bulk runs where you don't mind waiting up to an hour.
 *
 * Usage:
 *   node scripts/translate-batch.mjs --lang punjabi
 *   node scripts/translate-batch.mjs --lang hindi --limit 500
 *   node scripts/translate-batch.mjs --lang punjabi --estimate
 *   node scripts/translate-batch.mjs --resume <batch-id>
 *
 * Options:
 *   --lang <lang>     punjabi | hindi  (required unless --resume)
 *   --limit <n>       max strings to include (default: all untranslated)
 *   --strings-per-req strings per batch request (default: 50)
 *   --model <id>      Claude model (default: claude-haiku-4-5-20251001)
 *   --estimate        show token/cost estimate and exit (no API calls)
 *   --resume <id>     poll an existing batch ID and write results
 *   --help            show this help
 *
 * Reads:   translations.xlsx
 * Writes:  translations.xlsx (once batch completes)
 *          .translate-batch-state.json (batch ID for --resume)
 */

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { readXLSX, writeXLSX } from './xlsx-utils.mjs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const REFERENCES = resolve(ROOT, '..', 'references');
const XLSX_PATH  = join(REFERENCES, 'translations.xlsx');
const STATE_PATH = join(ROOT, '.translate-batch-state.json');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scripts/translate-batch.mjs --lang <punjabi|hindi> [options]

Options:
  --lang <lang>         Target language (punjabi or hindi) [required]
  --limit <n>           Max strings to submit (default: all untranslated)
  --strings-per-req <n> Strings per batch request (default: 50)
  --model <id>          Claude model ID (default: claude-haiku-4-5-20251001)
  --estimate            Print token/cost estimate only (no API calls)
  --resume <batch-id>   Poll an existing batch and write results to XLSX
  --help                Show this help
`);
  process.exit(0);
}

function getArg(flag, defaultVal) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : defaultVal;
}

const LANG            = getArg('--lang', null);
const LIMIT           = parseInt(getArg('--limit', '0'), 10);
const STRINGS_PER_REQ = parseInt(getArg('--strings-per-req', '50'), 10);
const MODEL           = getArg('--model', 'claude-haiku-4-5-20251001');
const ESTIMATE        = args.includes('--estimate');
const RESUME_ID       = getArg('--resume', null);

const LANG_LABELS = {
  punjabi: 'Punjabi (ਪੰਜਾਬੀ)',
  hindi:   'Hindi (हिन्दी)',
};

if (!RESUME_ID && (!LANG || !LANG_LABELS[LANG])) {
  console.error('Error: --lang must be "punjabi" or "hindi"  (or use --resume <batch-id>)');
  process.exit(1);
}

// ─── Prompt builder (same as translate-ai.mjs) ────────────────────────────────

function buildPrompt(lang, items) {
  const langLabel = LANG_LABELS[lang];
  const examples = items
    .map((item, i) => {
      const refs = [];
      const english = item.english || item.key;
      if (english)      refs.push(`English: "${english}"`);
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

// ─── Cost estimate ─────────────────────────────────────────────────────────────

// Rough token estimates per string (based on average VS Code UI string lengths)
const AVG_INPUT_TOKENS_PER_STRING  = 35;  // english + french + chinese refs
const AVG_OUTPUT_TOKENS_PER_STRING = 12;  // translated string

const PRICING = {
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },   // $/M tokens, with Batches API 50% off
  'claude-opus-4-6':           { input: 5.00, output: 25.00 },
  'claude-sonnet-4-6':         { input: 3.00, output: 15.00 },
};

function estimateCost(count, modelId) {
  // Prompt overhead per API request
  const promptOverhead = 250; // tokens for the system prompt per batch request
  const numRequests    = Math.ceil(count / STRINGS_PER_REQ);

  const inputTokens  = count * AVG_INPUT_TOKENS_PER_STRING  + numRequests * promptOverhead;
  const outputTokens = count * AVG_OUTPUT_TOKENS_PER_STRING;

  const pricing = PRICING[modelId] ?? PRICING['claude-haiku-4-5-20251001'];

  // Batches API is 50% cheaper than standard
  const inputCost  = (inputTokens  / 1_000_000) * pricing.input  * 0.5;
  const outputCost = (outputTokens / 1_000_000) * pricing.output * 0.5;

  return { inputTokens, outputTokens, inputCost, outputCost, total: inputCost + outputCost };
}

// ─── Resume: collect results from an existing batch ───────────────────────────

async function resumeBatch(client, batchId) {
  console.log(`\nResuming batch: ${batchId}`);

  // Load state (lang + rows snapshot info)
  let state = null;
  if (existsSync(STATE_PATH)) {
    try { state = JSON.parse(readFileSync(STATE_PATH, 'utf-8')); } catch {}
  }
  if (!state || state.batchId !== batchId) {
    console.error(`State file not found or does not match batch ID ${batchId}.`);
    console.error(`Re-run without --resume to start a new batch.`);
    process.exit(1);
  }

  await pollAndWrite(client, batchId, state.lang, state.requestItems);
}

// ─── Poll + write results ─────────────────────────────────────────────────────

async function pollAndWrite(client, batchId, lang, requestItems) {
  // Poll until complete
  let batch;
  while (true) {
    batch = await client.messages.batches.retrieve(batchId);
    const { processing, succeeded, errored, expired, canceled } = batch.request_counts;
    process.stdout.write(
      `\r  Status: ${batch.processing_status.padEnd(10)}  ` +
      `processing: ${processing}  succeeded: ${succeeded}  errored: ${errored}  `,
    );
    if (batch.processing_status === 'ended') break;
    await new Promise((r) => setTimeout(r, 30_000));
  }
  console.log('\n');

  // Load current XLSX (may have been edited while batch ran)
  const rows     = readXLSX(XLSX_PATH);
  const rowIndex = new Map(rows.map((r) => [`${r.module}|||${r.key}`, r]));

  // Build a map from custom_id → items
  const requestMap = new Map(requestItems.map((req) => [req.customId, req.items]));

  let written  = 0;
  let failed   = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const items = requestMap.get(result.custom_id);
    if (!items) continue;

    if (result.result.type === 'succeeded') {
      const text = result.result.message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('No JSON array found');
        const translations = JSON.parse(match[0]);
        if (translations.length !== items.length) throw new Error('Length mismatch');
        for (let i = 0; i < items.length; i++) {
          const row = rowIndex.get(`${items[i].module}|||${items[i].key}`);
          if (row) { row[lang] = translations[i]; written++; }
        }
      } catch (err) {
        console.warn(`  ⚠ Parse error for ${result.custom_id}: ${err.message}`);
        failed += items.length;
      }
    } else {
      failed += items.length;
      const errType = result.result.type;
      console.warn(`  ⚠ Request ${result.custom_id} ${errType}`);
    }
  }

  writeXLSX(XLSX_PATH, rows);

  console.log(`✅ Batch complete.`);
  console.log(`   Strings written: ${written}`);
  if (failed > 0) console.log(`   Failed strings:  ${failed}`);
  console.log(`\nRun \`npm run translations:build\` to regenerate extension JSON files.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic();

  // Resume mode
  if (RESUME_ID) {
    await resumeBatch(client, RESUME_ID);
    return;
  }

  const langLabel = LANG_LABELS[LANG];
  console.log(`\n📦 Batch Translation — ${langLabel}`);
  console.log(`   Model:      ${MODEL}`);
  console.log(`   Strings/req: ${STRINGS_PER_REQ}`);

  console.log(`\nReading ${XLSX_PATH}...`);
  const rows = readXLSX(XLSX_PATH);

  let todo = rows.filter((r) => r.module && r.key && !r[LANG]);
  console.log(`  Total valid rows:  ${rows.filter((r) => r.module && r.key).length}`);
  console.log(`  Already done:      ${rows.filter((r) => r.module && r.key && r[LANG]).length}`);
  console.log(`  Untranslated:      ${todo.length}`);

  if (LIMIT > 0) {
    todo = todo.slice(0, LIMIT);
    console.log(`  Submitting:        ${todo.length} (limited by --limit)`);
  } else {
    console.log(`  Submitting:        ${todo.length}`);
  }

  if (todo.length === 0) {
    console.log('\n✅ Nothing to translate!');
    return;
  }

  // Cost estimate
  const est = estimateCost(todo.length, MODEL);
  console.log(`\nEstimated cost (Batches API, 50% off standard):`);
  console.log(`  Input tokens:  ~${est.inputTokens.toLocaleString()}`);
  console.log(`  Output tokens: ~${est.outputTokens.toLocaleString()}`);
  console.log(`  Input cost:    ~$${est.inputCost.toFixed(4)}`);
  console.log(`  Output cost:   ~$${est.outputCost.toFixed(4)}`);
  console.log(`  Total:         ~$${est.total.toFixed(4)}`);

  if (ESTIMATE) {
    console.log('\n(--estimate flag set — exiting without API calls)');
    return;
  }

  // Build batch requests
  const numRequests    = Math.ceil(todo.length / STRINGS_PER_REQ);
  const requestItems   = [];
  const batchRequests  = [];

  for (let i = 0; i < numRequests; i++) {
    const items    = todo.slice(i * STRINGS_PER_REQ, (i + 1) * STRINGS_PER_REQ);
    const customId = `batch-${i}`;
    requestItems.push({ customId, items });
    batchRequests.push({
      custom_id: customId,
      params: {
        model: MODEL,
        max_tokens: 8192,
        messages: [{ role: 'user', content: buildPrompt(LANG, items) }],
      },
    });
  }

  console.log(`\nSubmitting ${batchRequests.length} requests to Batches API...`);
  const batch = await client.messages.batches.create({ requests: batchRequests });
  console.log(`  Batch ID: ${batch.id}`);
  console.log(`  Status:   ${batch.processing_status}`);

  // Save state for --resume
  writeFileSync(STATE_PATH, JSON.stringify({ batchId: batch.id, lang: LANG, requestItems }, null, 2));
  console.log(`  State saved to .translate-batch-state.json`);
  console.log(`\n  To resume later: node scripts/translate-batch.mjs --resume ${batch.id}`);
  console.log('  (Batches typically complete in < 1 hour, max 24 hours)\n');

  // Poll immediately
  await pollAndWrite(client, batch.id, LANG, requestItems);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
