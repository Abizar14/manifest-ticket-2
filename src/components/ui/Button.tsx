"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm hover:shadow-lift hover:-translate-y-0.5 focus:ring-blue-300 active:translate-y-0",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-300 dark:bg-white/10 dark:text-ink dark:hover:bg-white/15 dark:focus:ring-sky-500/40",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-200 dark:text-ink-muted dark:hover:bg-white/10 dark:hover:text-ink dark:focus:ring-white/15",
  danger:
    "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm hover:shadow-lift hover:-translate-y-0.5 focus:ring-rose-300",
  outline:
    "border border-slate-200 bg-white/80 backdrop-blur text-slate-700 hover:bg-slate-50 hover:border-blue-300 focus:ring-blue-200 dark:border-hairline dark:bg-surface/60 dark:text-ink dark:hover:bg-surface dark:hover:border-sky-500/40 dark:focus:ring-sky-500/30",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
