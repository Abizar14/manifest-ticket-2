"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  label?: string;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  label = "item",
  className,
}: Props) {
  const safeTotal = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), safeTotal);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const pages = getPageWindow(current, safeTotal);

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), safeTotal);
    if (next !== current) onPageChange(next);
  };

  const showNav = safeTotal > 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-hairline-soft dark:text-ink-muted",
        className,
      )}
    >
      <span>
        Menampilkan <strong className="text-slate-800 dark:text-ink">{from}</strong>–
        <strong className="text-slate-800 dark:text-ink">{to}</strong> dari{" "}
        <strong className="text-slate-800 dark:text-ink">{total}</strong> {label}
      </span>
      <nav
        className={cn(
          "inline-flex items-center gap-1",
          !showNav && "hidden",
        )}
        aria-label="Pagination"
      >
        <PageBtn
          onClick={() => go(1)}
          disabled={current <= 1}
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </PageBtn>
        <PageBtn
          onClick={() => go(current - 1)}
          disabled={current <= 1}
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageBtn>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-1.5 text-slate-400 dark:text-ink-subtle"
              aria-hidden
            >
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              active={p === current}
              onClick={() => go(p)}
              aria-current={p === current ? "page" : undefined}
              aria-label={`Halaman ${p}`}
            >
              {p}
            </PageBtn>
          ),
        )}
        <PageBtn
          onClick={() => go(current + 1)}
          disabled={current >= safeTotal}
          aria-label="Berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageBtn>
        <PageBtn
          onClick={() => go(safeTotal)}
          disabled={current >= safeTotal}
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </PageBtn>
      </nav>
    </div>
  );
}

function PageBtn({
  active,
  disabled,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex h-7 min-w-[28px] items-center justify-center rounded-md px-2 text-xs font-semibold transition",
        "ring-1 ring-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200",
        "dark:ring-hairline dark:bg-surface dark:text-ink-muted dark:hover:bg-sky-500/10 dark:hover:text-sky-300 dark:hover:ring-sky-500/40",
        active &&
          "bg-blue-600 text-white ring-blue-600 hover:bg-blue-600 hover:text-white dark:bg-sky-600 dark:text-white dark:ring-sky-600 dark:hover:bg-sky-600 dark:hover:text-white",
        disabled && "opacity-40 cursor-not-allowed hover:bg-white hover:text-slate-700 hover:ring-slate-200 dark:hover:bg-surface dark:hover:text-ink-muted dark:hover:ring-hairline",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function getPageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
