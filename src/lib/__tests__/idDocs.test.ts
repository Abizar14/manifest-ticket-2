import { describe, it, expect } from "vitest";
import { ID_DOCS, getIdDoc } from "../idDocs";

describe("idDocs registry", () => {
  it("getIdDoc fallback ke KTP untuk nilai tak dikenal", () => {
    expect(getIdDoc(undefined).id).toBe("ktp");
    expect(getIdDoc("sim").id).toBe("sim");
    expect(getIdDoc("id").id).toBe("id");
  });
});

describe("parser KTP", () => {
  const p = ID_DOCS.ktp.parseName;
  it("ambil nama dari label 'Nama :'", () => {
    const raw = [
      "PROVINSI JAWA BARAT",
      "KOTA BANDUNG",
      "NIK : 3273010101900001",
      "Nama : BUDI SANTOSO",
      "Tempat/Tgl Lahir : BANDUNG, 01-01-1990",
    ].join("\n");
    expect(p(raw)).toBe("BUDI SANTOSO");
  });
  it("ambil baris setelah NIK bila label tak terbaca", () => {
    const raw = ["NIK 3273010101900001", "SITI FATIMAH", "ALAMAT ..."].join("\n");
    expect(p(raw)).toBe("SITI FATIMAH");
  });
});

describe("parser SIM", () => {
  const p = ID_DOCS.sim.parseName;
  it("ambil nama dari label 'Nama :'", () => {
    const raw = [
      "SURAT IZIN MENGEMUDI",
      "POLRI",
      "Nama : SITI AMINAH",
      "Tempat/Tgl Lahir : JAKARTA",
    ].join("\n");
    expect(p(raw)).toBe("SITI AMINAH");
  });
  it("fallback baris kapital berbobot bila tanpa label", () => {
    const raw = ["SURAT IZIN MENGEMUDI", "AGUS WIBOWO PRATAMA", "GOL C"].join("\n");
    expect(p(raw)).toBe("AGUS WIBOWO PRATAMA");
  });
});

describe("parser ID instansi (BUMN/pejabat)", () => {
  const p = ID_DOCS.id.parseName;
  it("ambil nama dari label 'Nama :'", () => {
    const raw = [
      "PT PERTAMINA (PERSERO)",
      "KARTU PEGAWAI",
      "Nama : AGUS WIBOWO",
      "NIP 123456",
    ].join("\n");
    expect(p(raw)).toBe("AGUS WIBOWO");
  });
  it("fallback baris nama menonjol bila tanpa label", () => {
    const raw = [
      "KARTU PEGAWAI",
      "PT TELKOM INDONESIA",
      "RIZKY PRATAMA",
      "NIP 998877",
    ].join("\n");
    expect(p(raw)).toBe("RIZKY PRATAMA");
  });

  it("kartu BRI: abaikan 'BANK BRI'/'BUMN', ambil nama satu-kata", () => {
    const raw = ["BUMN", "BANK BRI", "RAMADIANSYAH", "8315431"].join("\n");
    expect(p(raw)).toBe("RAMADIANSYAH");
  });
});
