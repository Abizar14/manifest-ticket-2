"use client";

/**
 * Fetcher SISI-KLIEN untuk jadwal FIDS. Memanggil proxy lokal Next.js
 * (`/api/jadwal/*`), BUKAN langsung ke 103.210.122.2 — proxy yang mengurus
 * mixed-content, CORS, pagination & normalisasi.
 */

import {
  JadwalKedatangan,
  JadwalKeberangkatan,
  JadwalResponse,
} from "./types";

export interface JadwalFetchResult<T> {
  ok: boolean;
  items: T[];
  total: number;
  fetchedAt: string | null;
  error?: string;
}

async function fetchJadwal<T>(
  jenis: "keberangkatan" | "kedatangan",
  tanggal?: string,
): Promise<JadwalFetchResult<T>> {
  try {
    const qs = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : "";
    const res = await fetch(`/api/jadwal/${jenis}${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = (await res.json()) as JadwalResponse<T>;
    if (!res.ok || !body.ok) {
      return {
        ok: false,
        items: [],
        total: 0,
        fetchedAt: body?.fetchedAt ?? null,
        error: body?.error ?? `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      items: body.items,
      total: body.total,
      fetchedAt: body.fetchedAt,
    };
  } catch (e) {
    const err = e as Error;
    const error = err?.message?.includes("Failed to fetch")
      ? "Tidak bisa menghubungi proxy jadwal (server Next.js mati?)."
      : err?.message || "Gagal mengambil jadwal.";
    return { ok: false, items: [], total: 0, fetchedAt: null, error };
  }
}

export function fetchKeberangkatan(
  tanggal?: string,
): Promise<JadwalFetchResult<JadwalKeberangkatan>> {
  return fetchJadwal<JadwalKeberangkatan>("keberangkatan", tanggal);
}

export function fetchKedatangan(
  tanggal?: string,
): Promise<JadwalFetchResult<JadwalKedatangan>> {
  return fetchJadwal<JadwalKedatangan>("kedatangan", tanggal);
}
