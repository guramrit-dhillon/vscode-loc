/**
 * Shared XLSX utilities for the translations spreadsheet.
 *
 * Source of truth: translations.xlsx
 *
 * Column layout:
 *   module, key, english, french, chinese  ← reference (locked, not compiled)
 *   punjabi, hindi                         ← output (editable, compiled to JSON)
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export const HEADERS      = ['module', 'key', 'english', 'french', 'chinese', 'punjabi', 'hindi'];
export const REF_COLS     = new Set(['module', 'key', 'english', 'french', 'chinese']);
export const OUTPUT_LANGS = [
  { column: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { column: 'hindi',   label: 'Hindi (हिन्दी)'   },
];

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Read translations.xlsx and return an array of row objects.
 * @param {string} xlsxPath
 * @returns {Record<string, string>[]}
 */
export function readXLSX(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['Translations'];
  if (!ws) throw new Error("Sheet 'Translations' not found in the workbook.");
  return XLSX.utils.sheet_to_json(ws, { defval: '' }).map((row) => {
    const normalized = {};
    HEADERS.forEach((h) => { normalized[h] = String(row[h] ?? '').trim(); });
    return normalized;
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Header fill colors */
const FILL_GREY  = { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } }; // module, key
const FILL_BLUE  = { patternType: 'solid', fgColor: { rgb: 'BDD7EE' } }; // reference langs
const FILL_GREEN = { patternType: 'solid', fgColor: { rgb: 'E2EFDA' } }; // output langs
const FONT_BOLD  = { bold: true, sz: 11 };

function headerFill(col) {
  if (col === 'module' || col === 'key') return FILL_GREY;
  if (REF_COLS.has(col)) return FILL_BLUE;
  return FILL_GREEN;
}

/**
 * Write an array of row objects to translations.xlsx.
 * Applies column widths, frozen pane, and header styling.
 * @param {string} xlsxPath
 * @param {Record<string, string>[]} rows
 */
export function writeXLSX(xlsxPath, rows) {
  // Build array-of-arrays: header row + data rows
  const aoa = [
    HEADERS,
    ...rows.map((r) => HEADERS.map((h) => r[h] ?? '')),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths (characters)
  ws['!cols'] = [
    { wch: 70 },  // module
    { wch: 45 },  // key
    { wch: 60 },  // english
    { wch: 55 },  // french
    { wch: 50 },  // chinese
    { wch: 55 },  // punjabi
    { wch: 55 },  // hindi
  ];

  // Freeze first row + first two columns
  ws['!freeze'] = { xSplit: 2, ySplit: 1, topLeftCell: 'C2', activePane: 'bottomRight' };

  // Style header row
  HEADERS.forEach((h, colIdx) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    ws[ref] = ws[ref] ?? { v: h, t: 's' };
    ws[ref].s = { fill: headerFill(h), font: FONT_BOLD, alignment: { wrapText: false } };
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Translations');
  XLSX.writeFile(wb, xlsxPath, { bookType: 'xlsx', type: 'binary', cellStyles: true });
}
