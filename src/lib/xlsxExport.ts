"use client";

/**
 * Styled XLSX export using exceljs (dynamic-imported to avoid bloating the
 * initial JS bundle — only loaded when user clicks Export).
 *
 * Layout:
 *   1. Branded title block (merged across all columns, AFVS blue)
 *   2. Two-column metadata block (label | value)
 *   3. Blank separator row
 *   4. Header row (blue fill, white bold) — frozen
 *   5. Data rows (alternating zebra fill)
 *   6. Optional total row (gray fill, bold)
 *
 * Columns can carry a `tone` hint (success/warning/danger/info/mono) that
 * applies fill + font color per cell — useful for status badges.
 */

export type XlsxCell =
  | string
  | number
  | null
  | undefined
  | { value: string | number | null; tone?: XlsxTone };

export type XlsxTone = "success" | "warning" | "danger" | "info" | "mono" | "muted";

export type XlsxRow = XlsxCell[];

export interface XlsxMetaEntry {
  label: string;
  value: string | number | null | undefined;
}

export interface XlsxColumn {
  header: string;
  /** Approximate character width. Auto-fit if omitted. */
  width?: number;
  /** Alignment for body cells (header is always centered). */
  align?: "left" | "center" | "right";
}

export interface XlsxExportOptions {
  filename: string;
  /** Big branded title on the first row. */
  title: string;
  /** Optional subtitle below the title (smaller). */
  subtitle?: string;
  /** Sheet name (defaults to "Data"). Excel limit: 31 chars. */
  sheetName?: string;
  meta?: XlsxMetaEntry[];
  columns: XlsxColumn[];
  rows: XlsxRow[];
  /** Optional totals/summary row appended at the bottom. */
  totals?: XlsxCell[];
}

const PALETTE = {
  brand: "FF0B3B8C", // AFVS deep blue
  brandSoft: "FFE0EAFF",
  brandText: "FFFFFFFF",
  metaLabel: "FFF1F5F9",
  metaText: "FF334155",
  zebra: "FFF8FAFC",
  border: "FFCBD5E1",
  borderDark: "FF94A3B8",
  totalFill: "FFE2E8F0",
  text: "FF0F172A",
  textMuted: "FF64748B",
  tone: {
    success: { fill: "FFD1FAE5", text: "FF065F46" },
    warning: { fill: "FFFEF3C7", text: "FF92400E" },
    danger: { fill: "FFFEE2E2", text: "FF991B1B" },
    info: { fill: "FFDBEAFE", text: "FF1E40AF" },
    mono: { fill: "FFF1F5F9", text: "FF0F172A" },
    muted: { fill: "FFF8FAFC", text: "FF64748B" },
  } as const,
} as const;

function thinBorder(color: string = PALETTE.border) {
  return {
    top: { style: "thin" as const, color: { argb: color } },
    left: { style: "thin" as const, color: { argb: color } },
    bottom: { style: "thin" as const, color: { argb: color } },
    right: { style: "thin" as const, color: { argb: color } },
  };
}

function fitWidth(content: string | number | null | undefined, fallback = 12): number {
  const s = content === null || content === undefined ? "" : String(content);
  return Math.min(Math.max(s.length + 2, fallback), 60);
}

function unwrap(cell: XlsxCell): {
  value: string | number | null;
  tone?: XlsxTone;
} {
  if (cell === null || cell === undefined) return { value: null };
  if (typeof cell === "object" && "value" in cell) {
    return { value: cell.value, tone: cell.tone };
  }
  return { value: cell as string | number };
}

export async function downloadXlsx(options: XlsxExportOptions): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIPANDAI";
  wb.created = new Date();

  const sheetName = (options.sheetName ?? "Data").slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    views: [{ showGridLines: false }],
  });

  const colCount = options.columns.length;
  const lastColLetter = String.fromCharCode(64 + colCount);

  // ── Title block ──
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = options.title;
  titleCell.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: PALETTE.brandText },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: PALETTE.brand },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 32;

  let cursor = 2;

  if (options.subtitle) {
    ws.mergeCells(`A${cursor}:${lastColLetter}${cursor}`);
    const sub = ws.getCell(`A${cursor}`);
    sub.value = options.subtitle;
    sub.font = {
      name: "Calibri",
      size: 10,
      italic: true,
      color: { argb: PALETTE.textMuted },
    };
    sub.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: PALETTE.brandSoft },
    };
    sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(cursor).height = 20;
    cursor++;
  }

  // Blank separator
  cursor++;

  // ── Meta block ──
  if (options.meta && options.meta.length > 0) {
    for (const m of options.meta) {
      const labelCell = ws.getCell(`A${cursor}`);
      labelCell.value = m.label;
      labelCell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: PALETTE.metaText },
      };
      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: PALETTE.metaLabel },
      };
      labelCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      labelCell.border = thinBorder();

      ws.mergeCells(`B${cursor}:${lastColLetter}${cursor}`);
      const valCell = ws.getCell(`B${cursor}`);
      valCell.value = m.value ?? "—";
      valCell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: PALETTE.text },
      };
      valCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      valCell.border = thinBorder();

      ws.getRow(cursor).height = 18;
      cursor++;
    }
    // Blank separator
    cursor++;
  }

  // ── Header row ──
  const headerRowIdx = cursor;
  const headerRow = ws.getRow(headerRowIdx);
  options.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: PALETTE.brandText },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: PALETTE.brand },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = thinBorder(PALETTE.brand);
  });
  headerRow.height = 24;
  cursor++;

  // ── Data rows ──
  const dataStart = cursor;
  options.rows.forEach((row, rIdx) => {
    const r = ws.getRow(cursor);
    const isZebra = rIdx % 2 === 1;
    row.forEach((rawCell, cIdx) => {
      const { value, tone } = unwrap(rawCell);
      const cell = r.getCell(cIdx + 1);
      cell.value = value;
      cell.border = thinBorder();
      const align = options.columns[cIdx]?.align ?? "left";
      cell.alignment = {
        vertical: "middle",
        horizontal: align,
        wrapText: false,
      };

      if (tone) {
        const t = PALETTE.tone[tone];
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: t.fill },
        };
        cell.font = {
          name: tone === "mono" ? "Consolas" : "Calibri",
          size: 10,
          bold: tone !== "muted",
          color: { argb: t.text },
        };
      } else {
        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: PALETTE.text },
        };
        if (isZebra) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: PALETTE.zebra },
          };
        }
      }
    });
    r.height = 20;
    cursor++;
  });

  // ── Totals row ──
  if (options.totals && options.totals.length > 0) {
    const r = ws.getRow(cursor);
    options.totals.forEach((rawCell, cIdx) => {
      const { value } = unwrap(rawCell);
      const cell = r.getCell(cIdx + 1);
      cell.value = value;
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: PALETTE.text },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: PALETTE.totalFill },
      };
      cell.border = thinBorder(PALETTE.borderDark);
      const align = options.columns[cIdx]?.align ?? "left";
      cell.alignment = { vertical: "middle", horizontal: align };
    });
    r.height = 22;
    cursor++;
  }

  // ── Column widths ──
  options.columns.forEach((col, i) => {
    if (col.width) {
      ws.getColumn(i + 1).width = col.width;
      return;
    }
    // Auto-fit from content
    let max = col.header.length;
    for (const row of options.rows) {
      const { value } = unwrap(row[i]);
      max = Math.max(max, value === null || value === undefined ? 0 : String(value).length);
    }
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 50);
  });

  // ── Freeze header ──
  ws.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: headerRowIdx,
      showGridLines: false,
    },
  ];

  // ── Print options ──
  ws.headerFooter.oddHeader = `&L&"Calibri,Bold"&14${options.title}&R&"Calibri,Italic"&10SIPANDAI`;
  ws.headerFooter.oddFooter = `&LDicetak: ${new Date().toLocaleString("id-ID")}&RHal &P / &N`;

  // Reference dataStart so noUnusedLocals doesn't complain (also useful
  // when callers want to extend with conditional row logic).
  void dataStart;

  // ── Download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.filename.endsWith(".xlsx")
    ? options.filename
    : `${options.filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Keep fitWidth exported for potential reuse, suppress noUnusedExports
export { fitWidth };
