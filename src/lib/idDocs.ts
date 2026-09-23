"use client";

/**
 * Preset multi-dokumen identitas untuk pembacaan NAMA (KTP-first mode).
 * Tiap jenis punya (a) `crop` = kotak panduan sekaligus region yang di-OCR, dan
 * (b) `parseName` = parser nama khusus layout dokumen itu.
 *
 * Catatan: `crop` KTP sudah tertuning; SIM & ID (kartu instansi BUMN/pejabat)
 * memakai nilai awal yang MASIH PERLU disetel dengan contoh dokumen asli.
 * Lihat docs — sesuaikan angka crop bila kotak meleset dari baris nama.
 */

import {
  cleanName,
  extractNameByLabel,
  isHeaderOrLabel,
  recognizeRaw,
  type CropRect,
} from "./ktpOcr";

export type IdDocType = "ktp" | "sim" | "id";

export interface IdDocDef {
  id: IdDocType;
  label: string; // untuk selector & badge
  short: string; // label pendek (chip)
  hint: string; // instruksi singkat ke operator
  crop: CropRect;
  parseName: (rawText: string) => string | null;
}

// ── helper umum ──────────────────────────────────────────────────────────

function toLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Fallback lintas dokumen: ambil baris huruf-kapital paling "berbobot"
 * (terpanjang, ≥2 kata) yang BUKAN header/label. Cocok bila tak ada label "Nama".
 */
function bestUppercaseLine(
  lines: string[],
  headerKeywords: string[],
): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const line of lines) {
    if (!/^[A-Z][A-Z\s'.-]{4,}$/.test(line)) continue;
    if (isHeaderOrLabel(line, headerKeywords)) continue;
    const name = cleanName(line);
    if (name.length < 3) continue;
    const score = name.split(" ").filter((t) => t.length >= 3).length * 10 + name.length;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

// ── KTP ──────────────────────────────────────────────────────────────────
// (parser lengkap ada di ktpOcr.parseKtpName — di-reuse via import di bawah)
import { parseKtpName } from "./ktpOcr";

// ── SIM (Surat Izin Mengemudi) ─────────────────────────────────────────────
const SIM_HEADERS = [
  "SURAT", "IZIN", "MENGEMUDI", "POLRI", "REPUBLIK", "INDONESIA", "SIM",
  "NAMA", "TEMPAT", "TGL", "LAHIR", "ALAMAT", "PEKERJAAN", "BERLAKU",
  "GOL", "GOLONGAN", "TINGGI", "PROVINSI", "POLDA", "POLRES", "TANDA", "TANGAN",
  "A", "B", "C", "D", "LAKI", "PEREMPUAN",
];

function parseSimName(rawText: string): string | null {
  const lines = toLines(rawText);
  // 1) Label "Nama : X" (SIM punya field Nama eksplisit)
  const byLabel = extractNameByLabel(lines);
  if (byLabel) return byLabel;
  // 2) Fallback: baris kapital paling berbobot
  return bestUppercaseLine(lines, SIM_HEADERS);
}

// ── ID instansi (kartu pegawai BUMN / pejabat) ─────────────────────────────
// Layout sangat bervariasi → andalkan label "Nama/Name", fallback baris menonjol.
const ID_HEADERS = [
  "KARTU", "PEGAWAI", "IDENTITAS", "TANDA", "PENGENAL", "ID", "CARD",
  "NAMA", "NAME", "NIP", "NIK", "NPP", "JABATAN", "UNIT", "DIVISI",
  "PT", "PERSERO", "TBK", "BUMN", "INSTANSI", "KEMENTERIAN", "BERLAKU",
  "EMPLOYEE", "STAFF", "OFFICER",
  // Nama bank/perusahaan BUMN umum → jangan dianggap nama orang.
  "BANK", "BRI", "BNI", "BTN", "BSI", "MANDIRI", "PERTAMINA", "TELKOM",
  "PLN", "PEGADAIAN", "GARUDA", "ANTAM", "PUSAT", "CABANG", "KANTOR",
];

function parseGenericIdName(rawText: string): string | null {
  const lines = toLines(rawText);
  // 1) Label "Nama :" / "Name :"
  const byLabel = extractNameByLabel(lines);
  if (byLabel) return byLabel;
  // 2) Fallback: baris kapital paling berbobot yang bukan nama instansi/label
  return bestUppercaseLine(lines, ID_HEADERS);
}

// ── Registry ───────────────────────────────────────────────────────────────

// Boks area NAMA untuk kartu LANDSCAPE (KTP & SIM) — dipakai bersama supaya
// keduanya persis sama lebar & tinggi. Nilai hasil tuning via /ocr-tuner.
const LANDSCAPE_NAME_CROP: CropRect = { x: 0.02, y: 0.12, w: 0.95, h: 0.82 };

export const ID_DOCS: Record<IdDocType, IdDocDef> = {
  ktp: {
    id: "ktp",
    label: "KTP",
    short: "KTP",
    hint: "Arahkan NAMA di KTP ke kotak",
    // KTP & SIM = kartu LANDSCAPE (lebar), nama di strip atas → boks SAMA.
    crop: LANDSCAPE_NAME_CROP,
    parseName: parseKtpName,
  },
  sim: {
    id: "sim",
    label: "SIM",
    short: "SIM",
    hint: "Arahkan NAMA di SIM ke kotak",
    crop: LANDSCAPE_NAME_CROP, // sama dengan KTP (landscape)
    parseName: parseSimName,
  },
  id: {
    id: "id",
    label: "ID Instansi",
    short: "ID",
    hint: "Arahkan NAMA di kartu ke kotak",
    // ID instansi (BUMN/pejabat) = kartu PORTRAIT (vertikal). Nilai hasil tuning
    // via /ocr-tuner (kotak vertikal sempit menutup area nama).
    crop: { x: 0.28, y: 0.06, w: 0.42, h: 0.89 },
    parseName: parseGenericIdName,
  },
};

export const ID_DOC_LIST: IdDocDef[] = [ID_DOCS.ktp, ID_DOCS.sim, ID_DOCS.id];

export function getIdDoc(type: IdDocType | undefined | null): IdDocDef {
  return (type && ID_DOCS[type]) || ID_DOCS.ktp;
}

/** OCR + parse nama sesuai jenis dokumen. */
export async function recognizeIdName(
  image: Blob,
  doc: IdDocDef,
): Promise<{ rawText: string; name: string | null }> {
  const rawText = await recognizeRaw(image, doc.crop);
  return { rawText, name: doc.parseName(rawText) };
}
