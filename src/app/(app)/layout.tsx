import { AppShell } from "@/components/layout/AppShell";

// Shell (sidebar + topbar) dipasang sekali di sini agar tetap hidup saat
// berpindah halaman — tidak ada lagi layar "Loading…" & animasi ulang per navigasi.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
