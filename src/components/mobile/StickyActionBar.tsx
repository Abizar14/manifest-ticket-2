"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * iOS-style sticky bottom action bar. Sits above the BottomNav with
 * safe-area inset padding. Mobile-only — desktop should use inline buttons.
 *
 * Usage:
 *   <StickyActionBar>
 *     <PrimaryButton>Save</PrimaryButton>
 *   </StickyActionBar>
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 lg:hidden",
        "border-t border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80",
        className,
      )}
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 4rem)",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="flex items-center gap-2 py-2.5">{children}</div>
    </div>
  );
}
