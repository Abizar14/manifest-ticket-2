"use client";

import * as React from "react";
import type { Flight, PassengerRecord, SessionUser } from "@/lib/types";
import { getAirlineMeta } from "@/lib/airlines";
import { formatDateTime } from "@/lib/utils";

interface PrintManifestProps {
  flight: Flight;
  passengers: PassengerRecord[];
  session: SessionUser | null;
}

/**
 * Print-only manifest document. Hidden on screen via `.print-only`.
 * Layout is tuned for A4: clean header bar, structured info grid, full
 * passenger table, signature footer. Uses inline styles so the print
 * stylesheet doesn't strip them.
 */
export function PrintManifest({
  flight,
  passengers,
  session,
}: PrintManifestProps) {
  const airline = getAirlineMeta(flight.airlineCode);
  const operator = session?.name ?? session?.email ?? "—";
  const expected = flight.expectedPax ?? null;
  const printedAt = formatDateTime(new Date().toISOString());
  const percent =
    expected !== null && expected > 0
      ? Math.round((passengers.length / expected) * 100)
      : null;

  return (
    <div className="print-only print-manifest">
      {/* Top brand strip */}
      <div className="pm-strip">
        <div className="pm-brand">
          <div className="pm-brand-mark">AFVS</div>
          <div className="pm-brand-meta">
            <div className="pm-brand-name">Airport Flight Validation System</div>
            <div className="pm-brand-sub">Manifest Penumpang — Boarding Record</div>
          </div>
        </div>
        <div className="pm-strip-meta">
          <div className="pm-strip-label">DOC #</div>
          <div className="pm-strip-val">
            MNF-{flight.flightNumber}-{flight.departureDate.replace(/-/g, "")}
          </div>
        </div>
      </div>

      {/* Title bar */}
      <div className="pm-title-bar">
        <div>
          <div className="pm-title-eyebrow">{airline.name}</div>
          <div className="pm-title">
            {flight.flightNumber}
            <span className="pm-title-route">
              {" "}
              · {flight.originAirport} → {flight.destinationAirport}
            </span>
          </div>
        </div>
        <div className="pm-status">
          <div className="pm-status-label">STATUS</div>
          <div className={`pm-status-val pm-status-${flight.status.toLowerCase()}`}>
            {flight.status}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <table className="pm-info">
        <tbody>
          <tr>
            <td className="pm-info-label">Tanggal</td>
            <td className="pm-info-val">{flight.departureDate}</td>
            <td className="pm-info-label">Jam keberangkatan</td>
            <td className="pm-info-val">{flight.departureTime}</td>
          </tr>
          <tr>
            <td className="pm-info-label">Gate / Pos</td>
            <td className="pm-info-val">{flight.gateOrCheckpoint}</td>
            <td className="pm-info-label">Maskapai</td>
            <td className="pm-info-val">
              {airline.name} ({flight.airlineCode})
            </td>
          </tr>
          <tr>
            <td className="pm-info-label">Kapasitas</td>
            <td className="pm-info-val">
              {passengers.length}
              {expected !== null ? ` / ${expected}` : ""} pax
              {percent !== null ? ` (${percent}%)` : ""}
            </td>
            <td className="pm-info-label">Petugas</td>
            <td className="pm-info-val">{operator}</td>
          </tr>
          {flight.cancellationReason && (
            <tr>
              <td className="pm-info-label">Alasan pembatalan</td>
              <td className="pm-info-val" colSpan={3}>
                {flight.cancellationReason}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Passenger table */}
      <div className="pm-section-title">
        Daftar Penumpang
        <span className="pm-section-count"> ({passengers.length})</span>
      </div>

      {passengers.length === 0 ? (
        <div className="pm-empty">
          Tidak ada penumpang yang tercatat untuk penerbangan ini.
        </div>
      ) : (
        <table className="pm-pax">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>No.</th>
              <th style={{ width: "8%" }}>Seat</th>
              <th style={{ width: "26%" }}>Nama Penumpang</th>
              <th style={{ width: "13%" }}>PNR</th>
              <th style={{ width: "16%" }}>Tiket / SEQ</th>
              <th style={{ width: "17%" }}>Pertama Scan</th>
              <th style={{ width: "11%" }}>Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((p, i) => (
              <tr key={`${p.pnr}-${p.seatNumber}-${p.ticketNumber}`}>
                <td className="pm-cell-num">{i + 1}</td>
                <td className="pm-cell-seat">{p.seatNumber}</td>
                <td>
                  {p.passengerName ?? (
                    <span className="pm-italic">(nama tidak tersedia)</span>
                  )}
                </td>
                <td className="pm-mono">{p.pnr}</td>
                <td className="pm-mono">{p.ticketNumber}</td>
                <td className="pm-small">{formatDateTime(p.firstScannedAt)}</td>
                <td className="pm-sig-cell"></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer / signatures */}
      <div className="pm-footer">
        <div className="pm-sig">
          <div className="pm-sig-line" />
          <div className="pm-sig-label">Petugas Boarding</div>
          <div className="pm-sig-name">{operator}</div>
        </div>
        <div className="pm-sig">
          <div className="pm-sig-line" />
          <div className="pm-sig-label">Supervisor Lapangan</div>
          <div className="pm-sig-name">&nbsp;</div>
        </div>
        <div className="pm-sig">
          <div className="pm-sig-line" />
          <div className="pm-sig-label">Kapten / Cabin Crew</div>
          <div className="pm-sig-name">&nbsp;</div>
        </div>
      </div>

      <div className="pm-printed-meta">
        Dicetak: {printedAt} · Dokumen ini dihasilkan otomatis oleh sistem AFVS.
      </div>
    </div>
  );
}
