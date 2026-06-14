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

export function normalizeName(input: string): string {
  let s = stripDiacritics(input).toLowerCase();
  s = s.replace(/[^a-z\s.]/g, " ");
  for (const t of TITLES) {
    s = s.replace(new RegExp(`(^|\\s)${t.replace(/\./g, "\\.")}`, "g"), " ");
  }
  s = s.replace(/[.]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
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
  return Math.max(lev, tok) * 0.6 + Math.min(lev, tok) * 0.4;
}
