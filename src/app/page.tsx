"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { ensureSeed, getSession } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    ensureSeed();
  }, []);

  // Routing tujuan dijalankan SETELAH splash selesai fade-out (onExitComplete),
  // mengikuti logika lama: sesi aktif → kiosk/dashboard, mobile → onboarding,
  // selain itu → login.
  const route = useCallback(() => {
    const session = getSession();
    if (session) {
      router.replace(
        session.role === "security" ? "/scan/kiosk" : "/dashboard",
      );
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/login");
  }, [router]);

  return (
    <AnimatePresence onExitComplete={route}>
      {showSplash && (
        <SplashScreen
          key="splash"
          duration={6000}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </AnimatePresence>
  );
}
