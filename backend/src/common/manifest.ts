// Helper manifest penumpang per-flight. Kunci dedup = normalize(ticket) || normalize(pnr)
// (lihat docs/RANCANGAN-MANIFEST-PAX.md). 1 penumpang = 1 baris per flight walau
// kursi berubah saat check-in.

/** trim + uppercase + hapus spasi/strip, agar cocok lintas sumber. */
export function normalizeIdent(v: string | null | undefined): string {
  return (v ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

/**
 * Kunci dedup penumpang dalam satu flight: nomor tiket (lebih unik per orang),
 * fallback PNR. Mengembalikan null bila keduanya kosong → tak bisa didedup,
 * penumpang dilewati dari manifest (kasus langka).
 */
export function manifestDedupKey(
  ticketNumber: string | null | undefined,
  pnr: string | null | undefined,
): string | null {
  const t = normalizeIdent(ticketNumber);
  if (t) return t;
  const p = normalizeIdent(pnr);
  if (p) return p;
  return null;
}
