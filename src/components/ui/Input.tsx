"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200",
        "dark:border-hairline dark:bg-surface dark:text-ink dark:placeholder:text-ink-subtle dark:hover:border-sky-700 dark:focus:border-sky-400 dark:focus:ring-sky-900/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
