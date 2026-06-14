"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSeed } from "@/lib/storage";
import { getSession } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    ensureSeed();
    const session = getSession();
    if (session) {
      router.replace(session.role === "security" ? "/scan/kiosk" : "/dashboard");
      return;
    }
    if (typeof window !== "undefined") {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      if (isMobile) {
        router.replace("/onboarding");
        return;
      }
    }
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-slate-500 text-sm">Memuat…</div>
    </div>
  );
}
