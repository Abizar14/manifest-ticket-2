"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iOS-style grouped list. Use as:
 *
 *   <ListSection caption="Wi-Fi info will be shared.">
 *     <ListRow icon={...} title="..." trailing={...} />
 *     <ListRow icon={...} title="..." subtitle="..." onClick={...} />
 *   </ListSection>
 *
 * Children inside ListSection get auto-dividers and rounded corners on
 * first/last rows — matching the native UITableViewStyleInsetGrouped look.
 */

interface ListSectionProps {
  header?: React.ReactNode;
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ListSection({
  header,
  caption,
  children,
  className,
}: ListSectionProps) {
  return (
    <section className={cn("space-y-1.5", className)}>
      {header && (
        <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {header}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline shadow-card divide-y divide-hairline/70">
        {children}
      </div>
      {caption && (
        <p className="px-4 pt-1 text-[11.5px] leading-snug text-ink-muted">
          {caption}
        </p>
      )}
    </section>
  );
}

export type ListRowTone = "default" | "danger" | "success" | "warning";

interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: ListRowTone;
  showChevron?: boolean;
  className?: string;
}

const TONE_STYLES: Record<ListRowTone, { title: string; icon: string }> = {
  default: { title: "text-ink", icon: "bg-blue-100 text-blue-700" },
  danger: { title: "text-rose-600 dark:text-rose-300", icon: "bg-rose-100 text-rose-700" },
  success: { title: "text-emerald-700 dark:text-emerald-300", icon: "bg-emerald-100 text-emerald-700" },
  warning: { title: "text-amber-700 dark:text-amber-300", icon: "bg-amber-100 text-amber-700" },
};

export function ListRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  value,
  trailing,
  onClick,
  disabled,
  tone = "default",
  showChevron,
  className,
}: ListRowProps) {
  const tStyles = TONE_STYLES[tone];
  const interactive = !!onClick && !disabled;
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      {...(interactive ? { type: "button" as const, onClick } : {})}
      disabled={interactive ? disabled : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left",
        interactive &&
          "transition active:bg-surface-2 hover:bg-surface-2/60",
        disabled && "opacity-50",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            iconBg ?? tStyles.icon,
            iconColor,
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-medium",
            tStyles.title,
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted line-clamp-2">
            {subtitle}
          </span>
        )}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-[14px] text-ink-muted tabular-nums">
          {value}
        </span>
      )}
      {trailing}
      {showChevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
      )}
    </Tag>
  );
}

/**
 * iOS-style toggle switch. Drop-in trailing for ListRow.
 */
export function ListSwitch({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors",
        checked
          ? "bg-emerald-500"
          : "bg-slate-300 dark:bg-surface-elev ring-1 ring-hairline",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

/**
 * iOS-style inline stepper (− value +) for numeric rows.
 */
export function ListStepper({
  value,
  min,
  max,
  step = 5,
  onChange,
  suffix,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-surface-2 px-1 py-0.5 ring-1 ring-hairline",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          onChange(clamp(value - step));
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[18px] font-medium text-ink-muted transition active:bg-hairline/70 disabled:cursor-not-allowed"
        aria-label="kurang"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-[14px] font-semibold tabular-nums text-ink">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          onChange(clamp(value + step));
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[18px] font-medium text-ink-muted transition active:bg-hairline/70 disabled:cursor-not-allowed"
        aria-label="tambah"
      >
        +
      </button>
      {suffix && (
        <span className="pr-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">
          {suffix}
        </span>
      )}
    </div>
  );
}
