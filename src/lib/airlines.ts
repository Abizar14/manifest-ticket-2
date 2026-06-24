export interface AirlineMeta {
  code: string;
  name: string;
  /** Gradient class fragments for "rich" (web) mode background */
  gradient: string;
  /** Solid class for "chip" (PWA / fallback) mode background */
  solid: string;
  /** Foreground text color class */
  text: string;
  /** Ring/border accent class */
  ring: string;
  /** Optional real logo asset (PNG, transparent). Rendered on web mode. */
  logoSrc?: string;
}

const FALLBACK_TONES = [
  {
    gradient: "from-blue-600 to-cyan-500",
    solid: "bg-blue-600",
    text: "text-white",
    ring: "ring-blue-300/40",
  },
  {
    gradient: "from-violet-600 to-fuchsia-500",
    solid: "bg-violet-600",
    text: "text-white",
    ring: "ring-violet-300/40",
  },
  {
    gradient: "from-emerald-600 to-teal-500",
    solid: "bg-emerald-600",
    text: "text-white",
    ring: "ring-emerald-300/40",
  },
  {
    gradient: "from-amber-500 to-orange-500",
    solid: "bg-amber-500",
    text: "text-white",
    ring: "ring-amber-300/40",
  },
  {
    gradient: "from-slate-700 to-slate-500",
    solid: "bg-slate-700",
    text: "text-white",
    ring: "ring-slate-300/40",
  },
];

const REGISTRY: Record<string, AirlineMeta> = {
  GA: {
    code: "GA",
    name: "Garuda Indonesia",
    gradient: "from-sky-700 via-blue-600 to-cyan-500",
    solid: "bg-sky-700",
    text: "text-white",
    ring: "ring-sky-300/40",
    logoSrc: "/airlines/GA.webp",
  },
  JT: {
    code: "JT",
    name: "Lion Air",
    gradient: "from-rose-600 via-red-600 to-orange-500",
    solid: "bg-red-600",
    text: "text-white",
    ring: "ring-rose-300/40",
  },
  ID: {
    code: "ID",
    name: "Batik Air",
    gradient: "from-blue-800 via-blue-700 to-indigo-600",
    solid: "bg-blue-800",
    text: "text-white",
    ring: "ring-blue-300/40",
    logoSrc: "/airlines/ID.webp",
  },
  QZ: {
    code: "QZ",
    name: "Indonesia AirAsia",
    gradient: "from-rose-600 via-pink-600 to-red-500",
    solid: "bg-rose-600",
    text: "text-white",
    ring: "ring-rose-300/40",
  },
  SJ: {
    code: "SJ",
    name: "Sriwijaya Air",
    gradient: "from-red-700 via-red-600 to-rose-500",
    solid: "bg-red-700",
    text: "text-white",
    ring: "ring-red-300/40",
  },
  IW: {
    code: "IW",
    name: "Wings Air",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    solid: "bg-orange-500",
    text: "text-white",
    ring: "ring-orange-300/40",
    logoSrc: "/airlines/IW.webp",
  },
  QG: {
    code: "QG",
    name: "Citilink",
    gradient: "from-emerald-600 via-green-500 to-lime-500",
    solid: "bg-emerald-600",
    text: "text-white",
    ring: "ring-emerald-300/40",
    logoSrc: "/airlines/QG.webp",
  },
  IU: {
    code: "IU",
    name: "Super Air Jet",
    gradient: "from-fuchsia-600 via-pink-500 to-rose-500",
    solid: "bg-pink-600",
    text: "text-white",
    ring: "ring-pink-300/40",
    logoSrc: "/airlines/IU.webp",
  },
  SAA: {
    code: "SAA",
    name: "Smart Aviation",
    gradient: "from-sky-600 via-cyan-500 to-blue-500",
    solid: "bg-sky-600",
    text: "text-white",
    ring: "ring-sky-300/40",
    logoSrc: "/airlines/SAA.webp",
  },
  IP: {
    code: "IP",
    name: "Pelita Air",
    gradient: "from-blue-600 via-cyan-500 to-emerald-500",
    solid: "bg-cyan-600",
    text: "text-white",
    ring: "ring-cyan-300/40",
  },
  XT: {
    code: "XT",
    name: "Indonesia AirAsia X",
    gradient: "from-rose-700 via-rose-600 to-red-600",
    solid: "bg-rose-700",
    text: "text-white",
    ring: "ring-rose-300/40",
  },
  SQ: {
    code: "SQ",
    name: "Singapore Airlines",
    gradient: "from-amber-500 via-yellow-500 to-orange-500",
    solid: "bg-amber-500",
    text: "text-white",
    ring: "ring-amber-300/40",
  },
  MH: {
    code: "MH",
    name: "Malaysia Airlines",
    gradient: "from-blue-700 via-blue-600 to-red-500",
    solid: "bg-blue-700",
    text: "text-white",
    ring: "ring-blue-300/40",
  },
  AK: {
    code: "AK",
    name: "AirAsia",
    gradient: "from-red-600 via-rose-600 to-pink-500",
    solid: "bg-red-600",
    text: "text-white",
    ring: "ring-red-300/40",
  },
};

export function getAirlineMeta(code: string | null | undefined): AirlineMeta {
  const key = (code ?? "").toUpperCase().trim();
  const found = REGISTRY[key];
  if (found) return found;
  // Deterministic fallback per code so same airline always shows same color
  const idx =
    Array.from(key).reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    FALLBACK_TONES.length;
  const tone = FALLBACK_TONES[idx];
  return {
    code: key || "??",
    name: key || "Unknown",
    ...tone,
  };
}
