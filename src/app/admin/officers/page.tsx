"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  ApiOperator,
  ApiUser,
  apiCreateOperator,
  apiDeleteOperator,
  apiListOperators,
  apiSetOperatorPin,
  apiUpdateOperator,
  getApiUser,
  isAuthed,
  subscribeAuth,
} from "@/lib/api/client";

const STATIONS = ["SCP2", "BLUESKY"];
const STATION_LABEL: Record<string, string> = {
  SCP2: "SCP 2",
  BLUESKY: "Lounge Bluesky",
};
const ROLES = ["operator", "supervisor", "admin"];
const ROLE_TONE: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-sky-500/15 dark:text-sky-300",
  supervisor:
    "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300",
  operator:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-surface-2 dark:text-ink-muted dark:ring-hairline",
};

type FormState = {
  id: string | null;
  name: string;
  email: string;
  role: string;
  station: string;
  pin: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  email: "",
  role: "operator",
  station: "SCP2",
  pin: "",
};

export default function AdminOfficersPage() {
  const toast = useToast();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [backendUser, setBackendUser] = useState<ApiUser | null>(null);
  const [items, setItems] = useState<ApiOperator[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  // PIN yang baru di-generate/di-set, ditampilkan sekali untuk dicatat petugas.
  const [revealed, setRevealed] = useState<{ name: string; pin: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!isAuthed()) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const u = getApiUser();
    setBackendUser(u);
    setIsAdmin(u?.role === "admin");
    if (u?.role !== "admin") return; // jangan panggil /operators (pasti 403)
    setStatus("loading");
    const res = await apiListOperators();
    if (res.ok && res.data) {
      setItems(res.data.items);
      setStatus("ok");
      setError(null);
    } else {
      setStatus("error");
      setError(res.error ?? "Gagal memuat data.");
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeAuth(load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.station ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const openCreate = () => {
    setRevealed(null);
    setForm({ ...EMPTY_FORM });
  };
  const openEdit = (o: ApiOperator) => {
    setRevealed(null);
    setForm({
      id: o.id,
      name: o.name,
      email: o.email,
      role: o.role,
      station: o.station ?? "",
      pin: "",
    });
  };

  const handleSave = async () => {
    if (!form) return;
    if (form.name.trim().length < 2) {
      toast.warning("Nama minimal 2 karakter.");
      return;
    }
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) {
      toast.warning("PIN harus 4-6 digit angka (atau kosongkan untuk acak).");
      return;
    }
    setSaving(true);
    if (form.id) {
      const res = await apiUpdateOperator(form.id, {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
        station: form.station || null,
      });
      setSaving(false);
      if (res.ok) {
        toast.success("Petugas diperbarui.");
        setForm(null);
        load();
      } else {
        toast.error(res.error ?? "Gagal menyimpan.", "Gagal");
      }
    } else {
      const res = await apiCreateOperator({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
        station: form.station || undefined,
        pin: form.pin || undefined,
      });
      setSaving(false);
      if (res.ok && res.data) {
        toast.success(`Petugas ${res.data.operator.name} dibuat.`);
        setRevealed({ name: res.data.operator.name, pin: res.data.pin });
        setForm(null);
        load();
      } else {
        toast.error(res.error ?? "Gagal membuat petugas.", "Gagal");
      }
    }
  };

  const handleSetPin = async (o: ApiOperator) => {
    const res = await apiSetOperatorPin(o.id);
    if (res.ok && res.data) {
      setRevealed({ name: o.name, pin: res.data.pin });
      toast.success(`PIN ${o.name} di-reset.`);
      load();
    } else {
      toast.error(res.error ?? "Gagal set PIN.", "Gagal");
    }
  };

  const handleToggleActive = async (o: ApiOperator) => {
    const res = await apiUpdateOperator(o.id, { active: !o.active });
    if (res.ok) {
      toast.info(o.active ? "Petugas dinonaktifkan." : "Petugas diaktifkan.");
      load();
    } else {
      toast.error(res.error ?? "Gagal mengubah status.", "Gagal");
    }
  };

  const handleDelete = async (o: ApiOperator) => {
    if (!window.confirm(`Hapus petugas "${o.name}"? Tindakan ini permanen.`))
      return;
    const res = await apiDeleteOperator(o.id);
    if (res.ok) {
      toast.success("Petugas dihapus.");
      load();
    } else {
      toast.error(res.error ?? "Gagal menghapus.", "Gagal");
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-card dark:border-hairline dark:bg-surface/95 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25">
              <UserCog className="h-3.5 w-3.5" />
              Kelola Petugas · Server
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
              Manajemen Petugas AVSEC
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tambah, edit, nonaktifkan, atau set ulang <b>PIN</b> petugas di{" "}
              <b>SCP 2</b> &amp; <b>Lounge Bluesky</b>. PIN tersimpan ter-hash di
              server.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={load}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Tambah Petugas
              </button>
            )}
          </div>
        </section>

        {!authed ? (
          <NotConnected />
        ) : !isAdmin ? (
          <NotBackendAdmin backendUser={backendUser} />
        ) : (
          <>
            {/* PIN reveal banner */}
            {revealed && (
              <PinReveal
                name={revealed.name}
                pin={revealed.pin}
                onClose={() => setRevealed(null)}
              />
            )}

            {/* Search */}
            <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-card dark:border-hairline dark:bg-surface/95">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / email / pos…"
                className="min-w-[200px] flex-1 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
              />
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                <Users className="h-3.5 w-3.5" />
                {filtered.length} petugas
              </span>
            </section>

            {/* List */}
            <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-card dark:border-hairline dark:bg-surface/95">
              {status === "error" ? (
                <p className="px-4 py-10 text-center text-sm text-rose-600">
                  {error}
                </p>
              ) : filtered.length === 0 && status === "ok" ? (
                <p className="px-4 py-10 text-center text-sm text-ink-muted">
                  Tidak ada petugas.
                </p>
              ) : (
                <div className="divide-y divide-hairline">
                  {filtered.map((o) => (
                    <OfficerRow
                      key={o.id}
                      op={o}
                      onEdit={() => openEdit(o)}
                      onSetPin={() => handleSetPin(o)}
                      onToggleActive={() => handleToggleActive(o)}
                      onDelete={() => handleDelete(o)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Editor modal */}
      {form && (
        <OfficerForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
          onClose={() => setForm(null)}
        />
      )}
    </AppShell>
  );
}

function NotConnected() {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-center dark:border-amber-500/25 dark:bg-amber-500/10">
      <Server className="mx-auto h-8 w-8 text-amber-600" />
      <p className="mt-2 text-sm font-semibold text-ink">
        Belum tersambung ke backend
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Login aplikasi (sidebar) terpisah dari login server. Menu ini menulis ke
        server, jadi perlu login backend sebagai <b>admin</b>.
      </p>
      <Link
        href="/connect"
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
      >
        Buka Koneksi Backend
      </Link>
    </section>
  );
}

function NotBackendAdmin({ backendUser }: { backendUser: ApiUser | null }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-center dark:border-amber-500/25 dark:bg-amber-500/10">
      <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" />
      <p className="mt-2 text-sm font-semibold text-ink">
        Perlu login backend sebagai admin
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
        Login aplikasi (yang ada di sidebar) <b>terpisah</b> dari login server.
        Menu Kelola Petugas membaca/menulis ke server, jadi butuh akun{" "}
        <b>admin backend</b> — bukan admin aplikasi.
      </p>
      {backendUser && (
        <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-[11px] text-ink-muted ring-1 ring-hairline">
          <UserCog className="h-3.5 w-3.5" />
          Sekarang terhubung sebagai{" "}
          <b className="text-ink">{backendUser.name}</b>
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 font-bold uppercase ring-1 ring-hairline">
            {backendUser.role}
          </span>
        </p>
      )}
      <div className="mt-4">
        <Link
          href="/connect"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Login ulang sebagai admin (Koneksi Backend)
        </Link>
        <p className="mt-2 text-[11px] text-ink-subtle">
          Logout backend di sana, lalu login{" "}
          <code className="font-mono">admin@afvs.local</code>.
        </p>
      </div>
    </section>
  );
}

function PinReveal({
  name,
  pin,
  onClose,
}: {
  name: string;
  pin: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">
            PIN untuk {name} —{" "}
            <span className="font-mono text-lg tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              {pin}
            </span>
          </p>
          <p className="text-[11px] text-ink-muted">
            Catat & berikan ke petugas sekarang. PIN ini tidak akan ditampilkan
            lagi.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-xl p-2 text-ink-muted transition hover:bg-surface-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function OfficerRow({
  op,
  onEdit,
  onSetPin,
  onToggleActive,
  onDelete,
}: {
  op: ApiOperator;
  onEdit: () => void;
  onSetPin: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 transition hover:bg-surface-2/60 sm:px-4",
        !op.active && "opacity-60",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white ring-2 ring-white dark:ring-surface-elev">
        {op.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-bold text-ink">
            {op.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1",
              ROLE_TONE[op.role] ?? ROLE_TONE.operator,
            )}
          >
            {op.role}
          </span>
          {op.station && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-muted ring-1 ring-hairline">
              <MapPin className="h-3 w-3" />
              {STATION_LABEL[op.station] ?? op.station}
            </span>
          )}
          {op.hasPin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300">
              <KeyRound className="h-3 w-3" />
              PIN
            </span>
          )}
          {!op.active && (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300">
              nonaktif
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">{op.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconBtn title="Set/Reset PIN" onClick={onSetPin}>
          <KeyRound className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Edit" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconBtn>
        <button
          type="button"
          onClick={onToggleActive}
          title={op.active ? "Nonaktifkan" : "Aktifkan"}
          className={cn(
            "rounded-lg px-2 py-1.5 text-[11px] font-semibold ring-1 transition",
            op.active
              ? "bg-surface text-ink-muted ring-hairline hover:bg-surface-2"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25",
          )}
        >
          {op.active ? "Nonaktif" : "Aktifkan"}
        </button>
        <IconBtn title="Hapus" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "rounded-lg p-2 ring-1 ring-hairline transition",
        danger
          ? "text-rose-600 hover:bg-rose-50 hover:ring-rose-200 dark:hover:bg-rose-500/10"
          : "text-ink-muted hover:bg-surface-2 hover:text-blue-700",
      )}
    >
      {children}
    </button>
  );
}

function OfficerForm({
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(form.id);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface shadow-lift ring-1 ring-hairline sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            {isEdit ? (
              <Pencil className="h-4 w-4 text-blue-600" />
            ) : (
              <Plus className="h-4 w-4 text-blue-600" />
            )}
            {isEdit ? "Edit Petugas" : "Tambah Petugas"}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Nama">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Andi Saputra"
              className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
            />
          </Field>
          <Field label="Email (opsional — auto bila kosong)">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="andi@afvs.local"
              className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Peran">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pos / Station">
              <select
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
              >
                <option value="">— tanpa pos —</option>
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATION_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!isEdit && (
            <Field label="PIN (4-6 digit — kosongkan untuk acak)">
              <input
                type="text"
                inputMode="numeric"
                value={form.pin}
                maxLength={6}
                onChange={(e) =>
                  setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })
                }
                placeholder="acak"
                className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
              />
            </Field>
          )}
          {isEdit && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-[11px] text-ink-muted ring-1 ring-hairline">
              Untuk mengganti PIN, tutup dialog ini lalu klik ikon{" "}
              <KeyRound className="inline h-3 w-3" /> di baris petugas.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isEdit ? "Simpan" : "Buat Petugas"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
