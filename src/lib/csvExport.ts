/**
 * CSV export helper.
 * - Prepends UTF-8 BOM so Excel/Google Sheets correctly detect encoding.
 * - Emits a leading `sep=;` directive so Excel parses columns correctly
 *   regardless of the user's regional list-separator setting.
 * - Uses `;` as the field delimiter (matches Indonesian Excel default;
 *   Google Sheets & LibreOffice auto-detect either way).
 */

export type CsvCell = string | number | null | undefined;
export type CsvRow = CsvCell[];

export interface CsvMetaEntry {
  label: string;
  value: CsvCell;
}

export interface CsvExportOptions {
  filename: string;
  meta?: CsvMetaEntry[];
  headers: string[];
  rows: CsvRow[];
}

const DELIMITER = ";";

function escapeCell(cell: CsvCell): string {
  const s = cell === null || cell === undefined ? "" : String(cell);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToLine(row: CsvRow): string {
  return row.map(escapeCell).join(DELIMITER);
}

export function buildCsv(options: Omit<CsvExportOptions, "filename">): string {
  const lines: string[] = [];
  lines.push(`sep=${DELIMITER}`);
  if (options.meta && options.meta.length > 0) {
    for (const m of options.meta) {
      lines.push(rowToLine([m.label, m.value]));
    }
    lines.push("");
  }
  lines.push(rowToLine(options.headers));
  for (const row of options.rows) {
    lines.push(rowToLine(row));
  }
  return lines.join("\r\n");
}

export function downloadCsv(options: CsvExportOptions): void {
  const csv = buildCsv(options);
  // BOM ensures Excel reads UTF-8 correctly.
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
