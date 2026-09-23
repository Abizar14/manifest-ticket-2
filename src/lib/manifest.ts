/**
 * Helper manifest penumpang per-flight (sisi frontend). Kunci dedup HARUS sama
 * dengan backend (backend/src/common/manifest.ts): tiket → PNR ternormalisasi,
 * agar hitungan lokal & server konsisten. Lihat docs/RANCANGAN-MANIFEST-PAX.md.
 */

/** trim + uppercase + hapus spasi/strip. */
export function normalizeIdent(v: string | null | undefined): string {
  return (v ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

/**
 * Kunci dedup penumpang dalam satu flight: nomor tiket (fallback PNR).
 * Null bila keduanya kosong → tak bisa didedup (dilewati dari manifest).
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
