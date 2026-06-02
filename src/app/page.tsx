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
    if (session) router.replace("/dashboard");
    else router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-slate-500 text-sm">Memuat…</div>
    </div>
  );
}
