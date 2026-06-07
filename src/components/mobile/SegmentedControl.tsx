"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  className?: string;
  size?: "sm" | "md";
}

/**
 * iOS-style segmented control. Pill background with a sliding white
 * indicator behind the active segment.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const count = options.length;
  const padding = size === "sm" ? "p-0.5" : "p-1";
  const itemH = size === "sm" ? "h-7" : "h-8";
  const itemText = size === "sm" ? "text-[12px]" : "text-[13px]";

  return (
    <div
      className={cn(
        "relative inline-grid w-full rounded-xl bg-surface-2 ring-1 ring-hairline",
        padding,
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {/* sliding indicator */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 rounded-lg bg-surface shadow-sm ring-1 ring-hairline transition-transform duration-200 ease-out dark:bg-surface-elev",
        )}
        style={{
          width: `calc((100% - ${size === "sm" ? "0.25rem" : "0.5rem"}) / ${count})`,
          transform: `translateX(${idx * 100}%)`,
          left: size === "sm" ? "0.125rem" : "0.25rem",
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-[1] flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors",
              itemH,
              itemText,
              active ? "text-ink" : "text-ink-muted",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
