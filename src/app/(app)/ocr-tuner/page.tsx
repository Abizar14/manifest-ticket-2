"use client";

/**
 * Alat penyetelan crop OCR dokumen (KTP/SIM/ID) — dev/admin.
 * Upload foto kartu → atur kotak area nama (slider) → jalankan OCR → lihat nama
 * terdeteksi. Salin angka crop untuk dipasang ke src/lib/idDocs.ts.
 * Tak butuh kamera / kartu fisik saat itu — cukup foto kartunya.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { recognizeRaw } from "@/lib/ktpOcr";
import { ID_DOC_LIST, getIdDoc, type IdDocType } from "@/lib/idDocs";
import { cn } from "@/lib/utils";

type Crop = { x: number; y: number; w: number; h: number };

export default function OcrTunerPage() {
  const [docType, setDocType] = useState<IdDocType>("ktp");
  const [crop, setCrop] = useState<Crop>(getIdDoc("ktp").crop);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const urlRef = useRef<string | null>(null);

  // Ganti jenis dokumen → muat crop default-nya.
  useEffect(() => {
    setCrop(getIdDoc(docType).crop);
  }, [docType]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    setImgUrl(url);
    setBlob(f);
    setName(null);
    setRawText("");
  };

  const run = useCallback(async () => {
    if (!blob) return;
    setLoading(true);
    setName(null);
    setRawText("");
    try {
      const raw = await recognizeRaw(blob, crop);
      setRawText(raw);
      setName(getIdDoc(docType).parseName(raw));
    } catch (e) {
      setRawText(`ERROR: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [blob, crop, docType]);

  const set = (k: keyof Crop) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCrop((c) => ({ ...c, [k]: Number(e.target.value) }));

  const cropJson = `{ x: ${crop.x.toFixed(2)}, y: ${crop.y.toFixed(2)}, w: ${crop.w.toFixed(2)}, h: ${crop.h.toFixed(2)} }`;

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            Penyetel Crop OCR Dokumen
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Upload foto kartu, atur kotak area nama, jalankan OCR. Salin angka
            crop ke <code className="rounded bg-surface-2 px-1">src/lib/idDocs.ts</code>.
          </p>
        </div>

        {/* Jenis dokumen */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
            Jenis
          </span>
          {ID_DOC_LIST.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDocType(d.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition ring-1",
                docType === d.id
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-surface text-ink-muted ring-hairline hover:bg-surface-2",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Preview + kotak */}
          <Card>
            <CardBody className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
              {imgUrl ? (
                <div className="relative overflow-hidden rounded-xl ring-1 ring-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="kartu" className="w-full" />
                  <div
                    className="pointer-events-none absolute rounded-md border-[3px] border-emerald-400 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`,
                    }}
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-950">
                      area nama
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl bg-surface-2 text-sm text-ink-subtle ring-1 ring-hairline">
                  Pilih foto kartu (KTP/SIM/ID)
                </div>
              )}
            </CardBody>
          </Card>

          {/* Kontrol + hasil */}
          <Card>
            <CardBody className="space-y-3">
              {(["x", "y", "w", "h"] as (keyof Crop)[]).map((k) => (
                <label key={k} className="block">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                    <span className="uppercase">{k}</span>
                    <span className="tabular-nums">{crop[k].toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={crop[k]}
                    onChange={set(k)}
                    className="w-full"
                  />
                </label>
              ))}

              <div className="flex items-center gap-2">
                <Button onClick={run} disabled={!blob || loading} size="sm">
                  {loading ? "Membaca…" : "Jalankan OCR"}
                </Button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(cropJson)}
                  className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-hairline hover:bg-surface"
                >
                  Salin crop
                </button>
              </div>

              <div className="rounded-lg bg-surface-2 p-2 font-mono text-[11px] text-ink-muted ring-1 ring-hairline">
                crop: {cropJson}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                  Nama terdeteksi
                </p>
                <p
                  className={cn(
                    "mt-1 rounded-lg px-3 py-2 text-lg font-black ring-1",
                    name
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-rose-200",
                  )}
                >
                  {name ?? "(tak terbaca)"}
                </p>
              </div>

              {rawText && (
                <details>
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                    Teks mentah OCR
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[11px] text-ink-muted ring-1 ring-hairline">
                    {rawText}
                  </pre>
                </details>
              )}
            </CardBody>
          </Card>
        </div>

        <p className="text-xs text-ink-subtle">
          Tip: foto kartu sebaiknya memenuhi frame (mirip saat di kamera kiosk)
          supaya posisi crop mewakili kondisi nyata. Setelah pas, salin angka
          crop dan tempel ke <code className="rounded bg-surface-2 px-1">ID_DOCS.{docType}.crop</code>.
        </p>
      </div>
    </>
  );
}
