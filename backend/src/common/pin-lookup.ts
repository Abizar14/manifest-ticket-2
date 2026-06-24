import { createHmac } from "crypto";

/**
 * HMAC-SHA256 deterministik dari PIN, dipakai sebagai KUNCI LOOKUP O(1) di
 * kolom ber-index `Operator.pinLookup`. Ini BUKAN untuk verifikasi keamanan —
 * verifikasi tetap memakai bcrypt `pinHash`. Tujuannya hanya supaya login-PIN &
 * cek keunikan PIN tidak perlu men-scan + bcrypt seluruh operator (P-05/P-06).
 *
 * Secret diambil dari PIN_LOOKUP_SECRET (atau fallback JWT_SECRET). Bila secret
 * berubah, nilai pinLookup lama tidak cocok lagi — login akan jatuh ke jalur
 * legacy (bcrypt) lalu otomatis di-backfill ulang (migrate-on-login).
 */
export function pinLookupHash(pin: string): string {
  const secret =
    process.env.PIN_LOOKUP_SECRET ||
    process.env.JWT_SECRET ||
    "afvs-pin-lookup-fallback";
  return createHmac("sha256", secret).update(pin).digest("hex");
}
