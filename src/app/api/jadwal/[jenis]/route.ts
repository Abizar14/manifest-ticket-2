import { NextRequest, NextResponse } from "next/server";
import {
  Jenis,
  RawKeberangkatan,
  RawKedatangan,
  fetchAllPages,
  isJenis,
  normalizeKeberangkatan,
  normalizeKedatangan,
} from "@/lib/jadwal/source";
import {
  JadwalKeberangkatan,
  JadwalKedatangan,
  JadwalResponse,
} from "@/lib/jadwal/types";

/**
 * Proxy server-side ke FIDS bandara (103.210.122.2). Diperlukan karena API
 * sumber memakai http:// (mixed-content) & tanpa CORS, sehingga tidak bisa
 * di-fetch langsung dari browser. Route ini menarik semua halaman, menormalisasi
 * field bahasa Indonesia, lalu mengembalikan JSON bersih.
 *
 *   GET /api/jadwal/keberangkatan
 *   GET /api/jadwal/kedatangan?tanggal=2026-06-23
 */

export const dynamic = "force-dynamic";

/** Base URL dikontrol server (hindari SSRF / open-proxy). */
function fidsBase(): string {
  return (process.env.FIDS_BASE_URL || "http://103.210.122.2").trim();
}

// P-04: cache memori singkat per-jenis (per-instance server). Hit beruntun
// (poll halaman jadwal 60 dtk + sync AppShell 3 mnt + beberapa user) berbagi
// satu pull FIDS, bukan menarik ulang seluruh halaman tiap request. Filter
// `tanggal` diterapkan dari hasil cache, jadi tetap akurat per-tanggal.
const CACHE_TTL_MS = 30_000;
type Normalized<T> = { items: T[]; total: number; pages: number };
const cache = new Map<
  Jenis,
  { at: number; data: Normalized<JadwalKeberangkatan | JadwalKedatangan> }
>();

async function cachedFetch<
  TRaw,
  TOut extends JadwalKeberangkatan | JadwalKedatangan,
>(jenis: Jenis, normalize: (r: TRaw) => TOut): Promise<Normalized<TOut>> {
  const hit = cache.get(jenis);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data as Normalized<TOut>;
  }
  const { items, total, pages } = await fetchAllPages<TRaw>(fidsBase(), jenis);
  const data: Normalized<TOut> = { items: items.map(normalize), total, pages };
  cache.set(jenis, { at: Date.now(), data });
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { jenis: string } },
) {
  const { jenis } = params;
  if (!isJenis(jenis)) {
    return NextResponse.json(
      errorBody("Jenis harus 'keberangkatan' atau 'kedatangan'."),
      { status: 400 },
    );
  }

  const tanggal = req.nextUrl.searchParams.get("tanggal")?.trim() || null;

  try {
    if (jenis === "keberangkatan") {
      const { items, total, pages } = await cachedFetch<
        RawKeberangkatan,
        JadwalKeberangkatan
      >("keberangkatan", normalizeKeberangkatan);
      const out = tanggal ? items.filter((f) => f.tanggal === tanggal) : items;
      return NextResponse.json(okBody(out, total, pages));
    }

    const { items, total, pages } = await cachedFetch<
      RawKedatangan,
      JadwalKedatangan
    >("kedatangan", normalizeKedatangan);
    const out = tanggal ? items.filter((f) => f.tanggal === tanggal) : items;
    return NextResponse.json(okBody(out, total, pages));
  } catch (e) {
    const msg =
      (e as Error)?.name === "AbortError"
        ? "Timeout — server FIDS tidak merespons."
        : (e as Error)?.message || "Gagal mengambil data FIDS.";
    return NextResponse.json(errorBody(msg), { status: 502 });
  }
}

function okBody<T>(items: T[], total: number, pages: number): JadwalResponse<T> {
  return {
    ok: true,
    items,
    total,
    pages,
    fetchedAt: new Date().toISOString(),
  };
}

function errorBody(error: string): JadwalResponse<never> {
  return { ok: false, items: [], total: 0, pages: 0, fetchedAt: new Date().toISOString(), error };
}
