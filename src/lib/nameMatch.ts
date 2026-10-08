const TITLES = [
  "h.",
  "hj.",
  "drs.",
  "dra.",
  "dr.",
  "ir.",
  "prof.",
  "kh.",
  "k.h.",
  "s.pd.",
  "s.kom.",
  "s.h.",
  "s.t.",
  "s.e.",
  "s.sos.",
  "m.pd.",
  "m.kom.",
  "m.h.",
  "m.t.",
  "m.si.",
  "m.sc.",
  "mba.",
  "mr.",
  "mrs.",
  "ms.",
  "sdr.",
  "sdri.",
  "bp.",
  "ibu.",
  "tn.",
  "ny.",
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Gelar/label tanpa titik & label field yang sering ikut terbaca OCR — dibuang
// sebagai token utuh di mana pun posisinya (mis. "PRAYUDA MR ELFANDRO" → "prayuda
// elfandro", "NAMA PRAYUDA" → "prayuda").
const DROP_TOKENS = new Set([
  "mr", "mrs", "ms", "tn", "ny", "sdr", "sdri", "hj",
  "nama", "name", "nik",
]);

export function normalizeName(input: string): string {
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/[^a-z\s.]/g, " ");
  for (const t of TITLES) {
    s = s.replace(new RegExp(`(^|\\s)${t.replace(/\./g, "\\.")}`, "g"), " ");
  }
  s = s.replace(/[.]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s
    .split(" ")
    .filter((t) => t && !DROP_TOKENS.has(t))
    .join(" ");
  return s;
}

export function tokenize(name: string): string[] {
  return normalizeName(name).split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function levenshteinSim(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

function tokenSetSim(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size && !tb.size) return 1;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  const union = new Set<string>();
  ta.forEach((t) => union.add(t));
  tb.forEach((t) => union.add(t));
  return union.size ? inter / union.size : 0;
}

/**
 * Returns 0..1. Combines token-set (toleran urutan kata & gelar missing)
 * dengan Levenshtein normalized (toleran typo OCR).
 */
export function similarity(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const lev = levenshteinSim(na, nb);
  const tok = tokenSetSim(a, b);
  const base = Math.max(lev, tok) * 0.6 + Math.min(lev, tok) * 0.4;
  // Toleran salah-spasi OCR: "ELFANDRO" sering terbaca "ELF ANDRO" (atau
  // sebaliknya). Bandingkan juga versi tanpa spasi — kalau hurufnya sama
  // persis selain spasi, anggap cocok penuh.
  const compact = levenshteinSim(na.replace(/\s+/g, ""), nb.replace(/\s+/g, ""));
  return Math.max(base, compact);
}

/**
 * Rapatkan token kembar yang berurutan. Penumpang bernama tunggal sering ditulis
 * maskapai "SUKARNO/SUKARNO" → "SUKARNO SUKARNO", sedangkan KTP cukup "SUKARNO".
 */
function dedupeAdjacent(tokens: string[]): string[] {
  return tokens.filter((t, i) => i === 0 || t !== tokens[i - 1]);
}

const TRUNC_TOKEN_MIN = 0.8;

/**
 * Skor satu token boarding pass (`bp`, mungkin terpotong) terhadap satu token
 * KTP. Awalan utuh ("ABDU" ↔ "ABDURRAHMAN") = cocok penuh; selain itu toleran
 * typo OCR lewat Levenshtein, baik ke token utuh maupun ke awalannya.
 */
function truncatedTokenScore(bp: string, ktp: string): number {
  if (bp === ktp || ktp.startsWith(bp)) return 1;
  let s = levenshteinSim(bp, ktp);
  if (bp.length >= 4 && ktp.length > bp.length) {
    s = Math.max(s, levenshteinSim(bp, ktp.slice(0, bp.length)));
  }
  return s >= TRUNC_TOKEN_MIN ? s : 0;
}

/**
 * Skor untuk nama boarding pass yang TERPOTONG (field BCBP 20 char penuh).
 * Format hasil parser "DEPAN [TENGAH…] BELAKANG": token pertama & terakhir
 * harus cocok dengan token pertama & terakhir KTP; token tengah harus muncul
 * berurutan di KTP (boleh berupa awalan), dan nama tengah KTP yang hilang
 * karena terpotong boleh dilewati. Gagal salah satu syarat → 0.
 */
function truncatedScore(ktp: string[], bp: string[]): number {
  if (bp.length === 1) {
    return Math.max(0, ...ktp.map((k) => truncatedTokenScore(bp[0], k)));
  }
  if (ktp.length < bp.length) return 0;
  const scores: number[] = [];
  const first = truncatedTokenScore(bp[0], ktp[0]);
  const last = truncatedTokenScore(bp[bp.length - 1], ktp[ktp.length - 1]);
  if (!first || !last) return 0;
  scores.push(first, last);
  let k = 1;
  for (let b = 1; b < bp.length - 1; b++) {
    let found = 0;
    while (k < ktp.length - 1 && !found) {
      found = truncatedTokenScore(bp[b], ktp[k]);
      k++;
    }
    if (!found) return 0;
    scores.push(found);
  }
  return scores.reduce((a, c) => a + c, 0) / scores.length;
}

export interface KtpNameMatchOptions {
  /** Nama boarding pass terpotong (ParsedBarcode.passengerNameTruncated). */
  expectedTruncated?: boolean;
}

/**
 * Kemiripan 0..1 nama hasil OCR KTP vs nama boarding pass. Seperti
 * `similarity`, ditambah: nama tunggal yang diulang maskapai dirapatkan, dan
 * bila nama boarding pass terpotong, nama KTP yang lebih lengkap tetap cocok.
 */
export function matchKtpName(
  ocrName: string | null | undefined,
  expectedName: string | null | undefined,
  opts: KtpNameMatchOptions = {},
): number {
  if (!ocrName || !expectedName) return 0;
  const ktp = dedupeAdjacent(tokenize(ocrName));
  const bp = dedupeAdjacent(tokenize(expectedName));
  if (!ktp.length || !bp.length) return 0;
  const base = similarity(ktp.join(" "), bp.join(" "));
  if (!opts.expectedTruncated) return base;
  return Math.max(base, truncatedScore(ktp, bp));
}
