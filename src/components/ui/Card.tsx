"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-card backdrop-blur transition-all duration-300",
        "dark:border-hairline dark:bg-surface/95 dark:backdrop-blur-none dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative z-[1] flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100/80 dark:border-hairline-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold tracking-tight text-slate-800 dark:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative z-[1] p-5", className)} {...props} />;
}
