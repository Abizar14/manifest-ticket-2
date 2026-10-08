import { describe, it, expect } from "vitest";
import { matchKtpName, similarity } from "../nameMatch";

// Ambang default settings.ktpAutoPassThreshold.
const AUTO_PASS = 0.85;

describe("matchKtpName — nama boarding pass utuh", () => {
  it("sama persis → 1", () => {
    expect(matchKtpName("BUDI SANTOSO", "BUDI SANTOSO")).toBe(1);
  });

  it("toleran typo OCR satu huruf", () => {
    expect(matchKtpName("BUDI SANTOSA", "BUDI SANTOSO")).toBeGreaterThanOrEqual(AUTO_PASS);
  });

  it("nama tunggal yang diulang maskapai (SUKARNO/SUKARNO) → cocok", () => {
    expect(matchKtpName("SUKARNO", "SUKARNO SUKARNO")).toBe(1);
  });

  it("gelar boarding pass (MR) diabaikan", () => {
    expect(matchKtpName("RIZANI HUSYAIRI", "RIZANI HUSYAIRI MR")).toBe(1);
  });

  it("orang berbeda tetap tidak cocok", () => {
    expect(matchKtpName("BUDI SETIAWAN", "BUDI SANTOSO")).toBeLessThan(AUTO_PASS);
  });

  it("tanpa flag terpotong, KTP yang lebih panjang tidak dilonggarkan", () => {
    expect(matchKtpName("MUHAMMAD ABDURRAHMAN WAHID HASYIM", "MUHAMMAD ABDU HASYIM")).toBe(
      similarity("MUHAMMAD ABDURRAHMAN WAHID HASYIM", "MUHAMMAD ABDU HASYIM"),
    );
  });

  it("input kosong → 0", () => {
    expect(matchKtpName(null, "BUDI")).toBe(0);
    expect(matchKtpName("BUDI", "")).toBe(0);
  });
});

describe("matchKtpName — nama boarding pass terpotong (BCBP 20 char)", () => {
  const T = { expectedTruncated: true };

  it("token terpotong + nama tengah hilang → cocok", () => {
    // BCBP "HASYIM/MUHAMMAD ABDU"
    expect(
      matchKtpName("MUHAMMAD ABDURRAHMAN WAHID HASYIM", "MUHAMMAD ABDU HASYIM", T),
    ).toBeGreaterThanOrEqual(AUTO_PASS);
  });

  it("nama belakang multi-kata + nama depan terpotong → cocok", () => {
    // BCBP "WAHID HASYIM/MUHAMMA"
    expect(
      matchKtpName("MUHAMMAD ABDURRAHMAN WAHID HASYIM", "MUHAMMA WAHID HASYIM", T),
    ).toBeGreaterThanOrEqual(AUTO_PASS);
  });

  it("toleran typo OCR di token KTP yang lebih panjang", () => {
    expect(
      matchKtpName("MUHAMNAD ABDURRAHMAN WAHID HASYIM", "MUHAMMAD ABDU HASYIM", T),
    ).toBeGreaterThanOrEqual(AUTO_PASS);
  });

  it("nama belakang berbeda → tidak cocok", () => {
    expect(
      matchKtpName("MUHAMMAD ABDURRAHMAN WAHID SANTOSO", "MUHAMMAD ABDU HASYIM", T),
    ).toBeLessThan(AUTO_PASS);
  });

  it("nama depan berbeda → tidak cocok", () => {
    expect(
      matchKtpName("AHMAD ABDURRAHMAN WAHID HASYIM", "MUHAMMAD ABDU HASYIM", T),
    ).toBeLessThan(AUTO_PASS);
  });

  it("token tengah tidak ada di KTP → tidak cocok", () => {
    expect(
      matchKtpName("MUHAMMAD RIZKI WAHID HASYIM", "MUHAMMAD ABDU HASYIM", T),
    ).toBeLessThan(AUTO_PASS);
  });

  it("KTP lebih pendek dari boarding pass → tidak cocok", () => {
    expect(matchKtpName("MUHAMMAD HASYIM", "MUHAMMAD ABDU HASYIM", T)).toBeLessThan(AUTO_PASS);
  });
});
