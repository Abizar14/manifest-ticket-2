export type UserRole = "admin" | "supervisor" | "security";

export interface User {
  id: string;
  email: string;
  password: string;
  pin?: string;
  name: string;
  role: UserRole;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type FlightStatus =
  | "DRAFT"
  | "OPEN"
  | "ACTIVE"
  | "CLOSED"
  | "CANCELLED";

export interface Flight {
  id: string;
  flightNumber: string;
  airlineCode: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  gateOrCheckpoint: string;
  status: FlightStatus;
  expectedPax?: number; // total penumpang yang diharapkan boarding
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "STATUS_CHANGE"
  | "CLOSE_BOARDING"
  | "REOPEN_BOARDING"
  | "CANCEL_FLIGHT";

export interface FlightAuditEvent {
  id: string;
  flightId: string;
  flightNumber: string;
  action: AuditAction;
  fromStatus: FlightStatus | null;
  toStatus: FlightStatus | null;
  userId: string;
  userName: string;
  at: string; // ISO
  note?: string;
}

export interface BoardingProgress {
  boarded: number;
  expected: number | null;
  remaining: number | null;
  percent: number | null; // 0..100, null jika expected belum diset
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export type ScanResultStatus =
  | "VALID_FLIGHT"
  | "DUPLICATE_SCAN"
  | "FLIGHT_NOT_TODAY"
  | "FLIGHT_NOT_ACTIVE"
  | "UNKNOWN_FLIGHT"
  | "INVALID_BARCODE"
  | "KTP_MISMATCH";

export interface ScanEvent {
  id: string;
  rawBarcode: string;
  parsedFlightNumber: string | null;
  parsedPnr: string | null;
  parsedTicketNumber: string | null;
  parsedSeatNumber: string | null;
  parsedPassengerName: string | null;
  resultStatus: ScanResultStatus;
  message: string;
  flightId: string | null;
  scannedBy: string; // userId or email
  scannedAt: string; // ISO
  faceCaptureId?: string | null; // key di facePhotoStore (IndexedDB)
  ktpVerification?: KtpVerification | null;
}

export type KtpVerificationStatus =
  | "matched"
  | "mismatch"
  | "manual_pass"
  | "manual_reject"
  | "skipped"
  | "ocr_failed";

export interface KtpVerification {
  status: KtpVerificationStatus;
  ocrName: string | null;
  rawText?: string;
  similarity?: number;
  capturedAt: string;
  photoId?: string | null;
}

export interface ParsedBarcode {
  flightNumber: string;
  pnr: string;
  ticketNumber: string;
  seatNumber: string;
  passengerName: string | null;
}

export interface PassengerRecord {
  passengerName: string | null;
  pnr: string;
  ticketNumber: string;
  seatNumber: string;
  flightId: string;
  flightNumber: string;
  firstScannedAt: string;
  lastScannedAt: string;
  scanCount: number;
}
