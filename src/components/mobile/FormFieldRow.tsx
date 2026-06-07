"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldRowProps {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * iOS-style form row. Label on the left, control on the right.
 * Drop directly inside <ListSection>. Designed to pair with a stripped-down
 * input (or Select) using the FieldInput / FieldSelect helpers below.
 */
export function FormFieldRow({
  icon,
  label,
  required,
  hint,
  children,
  className,
}: FormFieldRowProps) {
  return (
    <label className={cn("flex items-center gap-3 px-4 py-2.5", className)}>
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-ink">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[11px] text-ink-subtle">
            {hint}
          </span>
        )}
      </span>
      <span className="ml-auto flex min-w-0 max-w-[55%] shrink-0 justify-end">
        {children}
      </span>
    </label>
  );
}

export type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Borderless input designed to sit inside FormFieldRow.
 */
export const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border-0 bg-transparent px-2 text-right text-[15px] font-semibold text-ink",
        "placeholder:font-normal placeholder:text-ink-subtle",
        "focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-blue-300",
        className,
      )}
      {...props}
    />
  ),
);
FieldInput.displayName = "FieldInput";

export type FieldSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const FieldSelect = React.forwardRef<
  HTMLSelectElement,
  FieldSelectProps
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 min-w-0 rounded-lg border-0 bg-transparent pr-1 text-right text-[15px] font-semibold text-ink",
      "focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-blue-300",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
FieldSelect.displayName = "FieldSelect";
