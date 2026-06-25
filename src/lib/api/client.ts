"use client";

/**
 * AFVS Backend API client (NestJS @ http://localhost:3001/api).
 *
 * Client-side fetch wrapper:
 * - JWT disimpan di localStorage (`afvs.api.token` + `afvs.api.user`).
 * - `authedFetch` auto-attach Bearer token & auto-logout pada 401.
 * - Semua fungsi return objek `ApiResult` (tidak melempar) supaya UI mudah.
 *
 * Base URL dari env `NEXT_PUBLIC_AFVS_API_BASE` (fallback localhost:3001/api).
 */

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string; // operator | supervisor | admin
  station: string | null;
}

export interface ApiResult<T> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

export interface ApiFlight {
  id: string;
  flightNumber: string;
  airlineCode: string;
  origin: string;
  destination: string;
  std: string; // ISO
  status: string; // SCHEDULED | OPEN | ACTIVE | CLOSED | CANCELLED
  station: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
}

export interface ScanPushFields {
  eventId: string;
  rawBarcode: string;
  flightNumber?: string | null;
  pnr?: string | null;
  ticketNumber?: string | null;
  seat?: string | null;
  passengerName?: string | null;
  resultStatus: string;
  message?: string | null;
  scannedAt: string; // ISO
  station: string;
  ktpStatus?: string | null;
  ktpName?: string | null;
  ktpSimilarity?: number | null;
  ktpCapturedAt?: string | null;
}

const TOKEN_KEY = "afvs.api.token";
const USER_KEY = "afvs.api.user";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_AFVS_API_BASE;
  return (base && base.trim()) || "http://localhost:3001/api";
}

// ─────────────────────────── Auth state ───────────────────────────

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getApiUser(): ApiUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

function setAuth(token: string, user: ApiUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuth();
}

export function clearAuth() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notifyAuth();
}

function notifyAuth() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("afvs:api-auth"));
}

export function subscribeAuth(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("afvs:api-auth", handler);
  return () => window.removeEventListener("afvs:api-auth", handler);
}

// ─────────────────────────── Helpers ───────────────────────────

async function readJson(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function errMsg(e: unknown): string {
  const err = e as Error;
  if (err?.name === "AbortError") return "Timeout — backend tidak merespons.";
  if (err?.message?.includes("Failed to fetch")) {
    return "Tidak bisa terhubung ke backend (offline / backend mati?).";
  }
  return err?.message || "Permintaan gagal.";
}

function httpError(status: number, body: unknown): string {
  const msg = (body as { message?: unknown })?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  if (status === 401) return "Sesi habis / belum login — silakan login ulang.";
  if (status === 403) return "Akses ditolak (role tidak cukup).";
  return `HTTP ${status}`;
}

/** Fetch dengan auto Bearer token + auto-logout pada 401. */
export async function authedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  if (res.status === 401) clearAuth();
  return res;
}

// ─────────────────────────── Endpoints ───────────────────────────

export async function apiLogin(
  email: string,
  password: string,
): Promise<ApiResult<{ token: string; user: ApiUser }>> {
  if (!isBrowser()) return { ok: false, error: "Tidak bisa login dari server." };
  try {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await readJson(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: httpError(res.status, body) };
    }
    const data = body as { token?: string; user?: ApiUser };
    if (data?.token && data?.user) {
      setAuth(data.token, data.user);
      return { ok: true, status: res.status, data: data as { token: string; user: ApiUser } };
    }
    return { ok: false, status: res.status, error: "Respons login tidak valid." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function apiLoginPin(
  pin: string,
): Promise<ApiResult<{ token: string; user: ApiUser }>> {
  if (!isBrowser()) return { ok: false, error: "Tidak bisa login dari server." };
  try {
    const res = await fetch(`${getApiBase()}/auth/login-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const body = await readJson(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: httpError(res.status, body) };
    }
    const data = body as { token?: string; user?: ApiUser };
    if (data?.token && data?.user) {
      setAuth(data.token, data.user);
      return { ok: true, status: res.status, data: data as { token: string; user: ApiUser } };
    }
    return { ok: false, status: res.status, error: "Respons login tidak valid." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function apiMe(): Promise<ApiResult<ApiUser>> {
  try {
    const res = await authedFetch("/auth/me");
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as ApiUser };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

const API_MAX_PER_PAGE = 200; // sesuai cap backend (Math.min(200, …))

// P-16: dedup GET in-flight — panggilan identik yang bersamaan (mis. poll 60 dtk
// bertemu refresh manual / beberapa komponen) berbagi SATU request, bukan
// masing-masing menembak network. Promise dihapus saat selesai.
const inflightGet = new Map<string, Promise<unknown>>();
function dedupGet<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = inflightGet.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn().finally(() => inflightGet.delete(key));
  inflightGet.set(key, p);
  return p;
}

export async function apiListFlights(params: {
  station?: string;
  date?: string;
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<ApiResult<Paginated<ApiFlight>>> {
  const qs = new URLSearchParams();
  if (params.station) qs.set("station", params.station);
  if (params.date) qs.set("date", params.date);
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("perPage", String(params.perPage));
  const path = `/flights?${qs.toString()}`;
  return dedupGet(path, async () => {
    try {
      const res = await authedFetch(path);
      const body = await readJson(res);
      if (!res.ok)
        return { ok: false, status: res.status, error: httpError(res.status, body) };
      return { ok: true, status: res.status, data: body as Paginated<ApiFlight> };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  });
}

/**
 * P-16: tarik SEMUA halaman flights (backend cap perPage=200) lalu gabung —
 * hindari kehilangan data >200 secara diam-diam.
 */
export async function apiListAllFlights(params: {
  station?: string;
  date?: string;
  status?: string;
}): Promise<ApiResult<Paginated<ApiFlight>>> {
  const all: ApiFlight[] = [];
  let total = 0;
  for (let page = 1; page <= 50; page++) {
    const res = await apiListFlights({ ...params, page, perPage: API_MAX_PER_PAGE });
    if (!res.ok || !res.data) return res;
    all.push(...res.data.items);
    total = res.data.total;
    if (res.data.items.length === 0 || all.length >= total) break;
  }
  return { ok: true, status: 200, data: { items: all, page: 1, perPage: all.length, total } };
}

/** Satu jadwal untuk di-upsert ke backend (snapshot harian / FIDS). */
export interface FlightSyncPayload {
  flightNumber: string;
  airlineCode: string;
  origin: string;
  destination: string;
  std: string; // ISO
  status: string; // SCHEDULED | OPEN | ACTIVE | CLOSED | CANCELLED
  station: string;
}

/**
 * Simpan snapshot jadwal harian ke backend (tabel Flight, upsert idempotent
 * by station+flightNumber+std). Dipakai saat tarik FIDS agar jadwalnya jadi
 * riwayat permanen, bukan cuma di localStorage.
 */
export async function apiSyncFlights(
  flights: FlightSyncPayload[],
): Promise<ApiResult<{ ok: boolean; synced: number }>> {
  if (flights.length === 0) {
    return { ok: true, data: { ok: true, synced: 0 } };
  }
  try {
    const res = await authedFetch("/flights/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flights }),
    });
    const body = await readJson(res);
    if (!res.ok)
      return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as { ok: boolean; synced: number } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Push satu scan event (multipart, idempotent by eventId). */
export async function apiPushScan(
  fields: ScanPushFields,
  faceBlob: Blob | null,
): Promise<ApiResult<unknown>> {
  try {
    const fd = new FormData();
    fd.set("eventId", fields.eventId);
    fd.set("rawBarcode", fields.rawBarcode);
    if (fields.flightNumber) fd.set("flightNumber", fields.flightNumber);
    if (fields.pnr) fd.set("pnr", fields.pnr);
    if (fields.ticketNumber) fd.set("ticketNumber", fields.ticketNumber);
    if (fields.seat) fd.set("seat", fields.seat);
    if (fields.passengerName) fd.set("passengerName", fields.passengerName);
    fd.set("resultStatus", fields.resultStatus);
    if (fields.message) fd.set("message", fields.message);
    fd.set("scannedAt", fields.scannedAt);
    fd.set("station", fields.station || "UNKNOWN");
    if (fields.ktpStatus) fd.set("ktpStatus", fields.ktpStatus);
    if (fields.ktpName) fd.set("ktpName", fields.ktpName);
    if (fields.ktpSimilarity != null)
      fd.set("ktpSimilarity", String(fields.ktpSimilarity));
    if (fields.ktpCapturedAt) fd.set("ktpCapturedAt", fields.ktpCapturedAt);
    if (faceBlob) fd.set("facePhoto", faceBlob, `${fields.eventId}.jpg`);

    const res = await authedFetch("/scan-events", { method: "POST", body: fd });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export interface ApiScanEvent {
  id: string;
  eventId: string;
  rawBarcode: string;
  flightNumber: string | null;
  pnr: string | null;
  ticketNumber: string | null;
  seat: string | null;
  passengerName: string | null;
  resultStatus: string;
  message: string | null;
  scannedAt: string;
  station: string;
  facePhotoPath: string | null;
  ktpStatus: string | null;
  ktpName: string | null;
  ktpSimilarity: number | null;
  flightId: string | null;
  operatorId: string;
  createdAt: string;
}

export async function apiListScans(params: {
  station?: string;
  date?: string;
  resultStatus?: string;
  flightNumber?: string;
  page?: number;
  perPage?: number;
}): Promise<ApiResult<Paginated<ApiScanEvent>>> {
  const qs = new URLSearchParams();
  if (params.station) qs.set("station", params.station);
  if (params.date) qs.set("date", params.date);
  if (params.resultStatus) qs.set("resultStatus", params.resultStatus);
  if (params.flightNumber) qs.set("flightNumber", params.flightNumber);
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("perPage", String(params.perPage));
  const path = `/scan-events?${qs.toString()}`;
  return dedupGet(path, async () => {
    try {
      const res = await authedFetch(path);
      const body = await readJson(res);
      if (!res.ok)
        return { ok: false, status: res.status, error: httpError(res.status, body) };
      return { ok: true, status: res.status, data: body as Paginated<ApiScanEvent> };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  });
}

/**
 * P-16: tarik SEMUA halaman scan-events (backend cap perPage=200) lalu gabung —
 * hindari kehilangan data >200 secara diam-diam.
 */
export async function apiListAllScans(params: {
  station?: string;
  date?: string;
  resultStatus?: string;
  flightNumber?: string;
}): Promise<ApiResult<Paginated<ApiScanEvent>>> {
  const all: ApiScanEvent[] = [];
  let total = 0;
  for (let page = 1; page <= 50; page++) {
    const res = await apiListScans({ ...params, page, perPage: API_MAX_PER_PAGE });
    if (!res.ok || !res.data) return res;
    all.push(...res.data.items);
    total = res.data.total;
    if (res.data.items.length === 0 || all.length >= total) break;
  }
  return { ok: true, status: 200, data: { items: all, page: 1, perPage: all.length, total } };
}

// ─────────────────────────── Operators (admin) ───────────────────────────

export interface ApiOperator {
  id: string;
  email: string;
  name: string;
  role: string; // operator | supervisor | admin
  station: string | null;
  active: boolean;
  hasPin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperatorInput {
  name: string;
  email?: string;
  role?: string;
  station?: string;
  pin?: string; // kosong = PIN acak
  password?: string;
}

/** Hasil create: PIN (dan password bila digenerate) hanya muncul SEKALI di sini. */
export interface CreateOperatorResult {
  operator: ApiOperator;
  pin: string;
  password?: string;
}

export async function apiListOperators(params?: {
  station?: string;
  role?: string;
  q?: string;
}): Promise<ApiResult<{ items: ApiOperator[] }>> {
  try {
    const qs = new URLSearchParams();
    if (params?.station) qs.set("station", params.station);
    if (params?.role) qs.set("role", params.role);
    if (params?.q) qs.set("q", params.q);
    const res = await authedFetch(`/operators?${qs.toString()}`);
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as { items: ApiOperator[] } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function apiCreateOperator(
  input: CreateOperatorInput,
): Promise<ApiResult<CreateOperatorResult>> {
  try {
    const res = await authedFetch("/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as CreateOperatorResult };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function apiUpdateOperator(
  id: string,
  patch: Partial<Pick<ApiOperator, "name" | "email" | "role" | "station" | "active">>,
): Promise<ApiResult<ApiOperator>> {
  try {
    const res = await authedFetch(`/operators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as ApiOperator };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Set/reset PIN. Kirim pin kosong → server generate acak. Return PIN plaintext. */
export async function apiSetOperatorPin(
  id: string,
  pin?: string,
): Promise<ApiResult<{ pin: string }>> {
  try {
    const res = await authedFetch(`/operators/${id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pin ? { pin } : {}),
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as { pin: string } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function apiDeleteOperator(
  id: string,
): Promise<ApiResult<{ ok: true }>> {
  try {
    const res = await authedFetch(`/operators/${id}`, { method: "DELETE" });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, status: res.status, error: httpError(res.status, body) };
    return { ok: true, status: res.status, data: body as { ok: true } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Ambil foto wajah (auth-gated) sebagai object URL untuk <img>. Null jika tak ada. */
export async function getFacePhotoObjectUrl(
  eventId: string,
): Promise<string | null> {
  try {
    const res = await authedFetch(`/face-photos/${eventId}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Cek backend hidup (login probe ringan tidak perlu; pakai /docs-less ping). */
export async function apiHealth(): Promise<ApiResult<true>> {
  try {
    // Endpoint apa pun yang publik; /auth/login OPTIONS atau GET flights 401.
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: "OPTIONS",
    });
    // Server hidup kalau merespons apa pun (termasuk 404/405).
    return { ok: true, status: res.status, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
