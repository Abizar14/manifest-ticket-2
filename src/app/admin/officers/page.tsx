"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
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

/**
 * PIN gampang ditebak (angka sama / berurutan). Cermin dari guard backend —
 * dicek di klien dulu untuk feedback cepat. Login-PIN cocok ke semua petugas,
 * jadi PIN lemah = risiko keamanan, bukan cuma soal mudah diingat.
 */
function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true; // 0000, 111111
  return "0123456789".includes(pin) || "9876543210".includes(pin); // 1234, 6543
}

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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [areaFilter, setAreaFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [detailOp, setDetailOp] = useState<ApiOperator | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  // PIN yang baru di-generate/di-set, ditampilkan sekali untuk dicatat petugas.
  const [revealed, setRevealed] = useState<{ name: string; pin: string } | null>(
    null,
  );
  // Petugas yang sedang di-set/reset PIN-nya (buka modal Set PIN).
  const [pinTarget, setPinTarget] = useState<ApiOperator | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

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
    return items.filter((o) => {
      const matchQuery =
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.station ?? "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? o.active : !o.active);
      const matchArea = areaFilter === "all" || (o.station ?? "") === areaFilter;
      const matchRole = roleFilter === "all" || o.role === roleFilter;
      return matchQuery && matchStatus && matchArea && matchRole;
    });
  }, [items, query, statusFilter, areaFilter, roleFilter]);

  // Opsi area dinamis dari data (mis. SCP2 / BLUESKY / CGK-T3).
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((o) => o.station && set.add(o.station));
    return Array.from(set);
  }, [items]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((o) => o.active).length,
      scp2: items.filter((o) => o.station === "SCP2").length,
      bluesky: items.filter((o) => o.station === "BLUESKY").length,
    }),
    [items],
  );

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
    if (form.pin && isWeakPin(form.pin)) {
      toast.warning("PIN terlalu mudah ditebak (angka sama/berurutan). Pilih lain.");
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

  // pin kosong → server generate acak; pin diisi → PIN pilihan (dicek lemah dulu).
  const handleSetPin = async (o: ApiOperator, pin?: string) => {
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        toast.warning("PIN harus 4-6 digit angka.");
        return;
      }
      if (isWeakPin(pin)) {
        toast.warning("PIN terlalu mudah ditebak (angka sama/berurutan).");
        return;
      }
    }
    setPinSaving(true);
    const res = await apiSetOperatorPin(o.id, pin || undefined);
    setPinSaving(false);
    if (res.ok && res.data) {
      setPinTarget(null);
      setRevealed({ name: o.name, pin: res.data.pin });
      toast.success(pin ? `PIN ${o.name} diperbarui.` : `PIN ${o.name} di-reset.`);
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
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-100/80 bg-gradient-to-br from-sky-50 via-white to-blue-50/60 p-5 shadow-card ring-1 ring-white/60 dark:border-hairline dark:from-surface dark:via-surface dark:to-surface/80 dark:ring-hairline sm:p-6">
          {/* dekorasi blur */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-300/25 blur-3xl dark:bg-sky-500/10" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-500/10" />

          <div className="relative flex flex-col gap-5">
            {/* baris atas: badge + tombol */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200 backdrop-blur dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600/10 text-blue-600 dark:bg-sky-500/20 dark:text-sky-300">
                  <UserCog className="h-3.5 w-3.5" />
                </span>
                Kelola Petugas • Server
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={load}
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-white/90 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:bg-white hover:shadow disabled:opacity-60 dark:border-hairline dark:bg-surface-2"
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    Tambah Petugas
                  </button>
                )}
              </div>
            </div>

            {/* baris isi: judul + ilustrasi + statistik */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-md">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  Manajemen Petugas AVSEC
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Kelola akun petugas AVSEC di <b>SCP 2</b> &amp;{" "}
                  <b>Lounge Bluesky</b>. PIN tersimpan ter-hash di server untuk
                  keamanan data.
                </p>
              </div>

              <HeroSecurityArt />

              {/* 4 stat card */}
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:max-w-2xl lg:flex-1">
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  tone="blue"
                  label="Total Petugas"
                  value={stats.total}
                  sub="Akun terdaftar"
                />
                <StatCard
                  icon={<Activity className="h-5 w-5" />}
                  tone="green"
                  label="Petugas Aktif"
                  value={stats.active}
                  sub="Sedang aktif"
                />
                <StatCard
                  icon={<MapPin className="h-5 w-5" />}
                  tone="sky"
                  label="Area SCP 2"
                  value={stats.scp2}
                  sub="Petugas bertugas"
                />
                <StatCard
                  icon={<Building2 className="h-5 w-5" />}
                  tone="purple"
                  label="Lounge Bluesky"
                  value={stats.bluesky}
                  sub="Petugas bertugas"
                />
              </div>
            </div>
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

            {/* Search + filter */}
            <section className="flex flex-col gap-3 rounded-2xl border border-blue-100/70 bg-white/90 p-3 shadow-card backdrop-blur dark:border-hairline dark:bg-surface/95 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama, email, atau posisi petugas…"
                  className="w-full rounded-xl border border-blue-100 bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none ring-blue-200 transition focus:border-blue-300 focus:ring-2 dark:border-hairline"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  icon={<Activity className="h-3.5 w-3.5" />}
                  value={statusFilter}
                  onChange={(v) =>
                    setStatusFilter(v as "all" | "active" | "inactive")
                  }
                  options={[
                    { value: "all", label: "Semua Status" },
                    { value: "active", label: "Aktif" },
                    { value: "inactive", label: "Nonaktif" },
                  ]}
                />
                <FilterSelect
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  value={areaFilter}
                  onChange={setAreaFilter}
                  options={[
                    { value: "all", label: "Semua Area" },
                    ...areaOptions.map((a) => ({
                      value: a,
                      label: STATION_LABEL[a] ?? a,
                    })),
                  ]}
                />
                <FilterSelect
                  icon={<UserCog className="h-3.5 w-3.5" />}
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: "all", label: "Semua Posisi" },
                    ...ROLES.map((r) => ({
                      value: r,
                      label: r.charAt(0).toUpperCase() + r.slice(1),
                    })),
                  ]}
                />
              </div>
            </section>

            {/* Grid card petugas */}
            {status === "error" ? (
              <section className="rounded-3xl border border-rose-200 bg-rose-50/60 px-4 py-12 text-center text-sm text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10">
                {error}
              </section>
            ) : filtered.length === 0 && status === "ok" ? (
              <section className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-14 text-center dark:border-hairline dark:bg-surface/95">
                <Users className="mx-auto h-8 w-8 text-ink-subtle" />
                <p className="mt-2 text-sm font-semibold text-ink">
                  Tidak ada petugas yang cocok
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Coba ubah kata kunci atau filter.
                </p>
              </section>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((o) => (
                  <OfficerCard
                    key={o.id}
                    op={o}
                    onDetail={() => setDetailOp(o)}
                    onEdit={() => openEdit(o)}
                    onSetPin={() => {
                      setRevealed(null);
                      setPinTarget(o);
                    }}
                    onToggleActive={() => handleToggleActive(o)}
                    onDelete={() => handleDelete(o)}
                  />
                ))}
              </div>
            )}
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

      {/* Set / Reset PIN modal */}
      {pinTarget && (
        <SetPinModal
          op={pinTarget}
          saving={pinSaving}
          onSubmit={(pin) => handleSetPin(pinTarget, pin)}
          onClose={() => setPinTarget(null)}
        />
      )}

      {/* Detail petugas (read-only) */}
      {detailOp && (
        <OfficerDetail
          op={detailOp}
          onEdit={() => {
            const o = detailOp;
            setDetailOp(null);
            openEdit(o);
          }}
          onClose={() => setDetailOp(null)}
        />
      )}
    </AppShell>
  );
}

function SetPinModal({
  op,
  saving,
  onSubmit,
  onClose,
}: {
  op: ApiOperator;
  saving: boolean;
  onSubmit: (pin?: string) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const weak = pin.length >= 4 && isWeakPin(pin);
  const tooShort = pin.length > 0 && pin.length < 4;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-surface shadow-lift ring-1 ring-hairline sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <KeyRound className="h-4 w-4 text-blue-600" />
            Set / Reset PIN — {op.name}
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
          <Field label="PIN baru (4-6 digit — kosongkan untuk acak)">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="biar petugas pilih yang mudah diingat"
              className="w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
            />
          </Field>
          {weak && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25">
              PIN terlalu mudah ditebak (angka sama/berurutan). Pilih kombinasi lain.
            </p>
          )}
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[11px] text-ink-muted ring-1 ring-hairline">
            Tip: biarkan petugas memilih PIN yang ia hafal (hindari tanggal lahir
            / pola gampang). PIN disimpan ter-hash — tak bisa dilihat lagi nanti.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">
          <button
            type="button"
            onClick={() => onSubmit(undefined)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60"
          >
            Acak otomatis
          </button>
          <button
            type="button"
            onClick={() => onSubmit(pin)}
            disabled={saving || pin.length < 4 || weak || tooShort}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Simpan PIN
          </button>
        </div>
      </div>
    </div>
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

const STATION_TONE: Record<string, string> = {
  SCP2: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300",
  BLUESKY:
    "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300",
};

/** Inisial (maks 2 huruf) untuk fallback avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pemetaan email → file foto di `public/petugas/`. Dicocokkan ke nama
 * (Citra/Dewi = foto perempuan, dst). Email lain dipilih deterministik dari
 * pool agar stabil (tidak berubah-ubah tiap render).
 */
const AVATAR_BY_EMAIL: Record<string, string> = {
  "avsec1@afvs.local": "petugas1", // Andi (L)
  "avsec2@afvs.local": "petugas3", // Budi (L)
  "avsec3@afvs.local": "petugas2", // Citra (P)
  "avsec4@afvs.local": "petugas4", // Dewi (P, hijab)
  "avsec5@afvs.local": "petugas5", // Eko (L)
  "admin@afvs.local": "petugas1",
  "operator@afvs.local": "petugas5",
};
const AVATAR_POOL = ["petugas1", "petugas2", "petugas3", "petugas4", "petugas5"];

function avatarSrc(email: string): string {
  const key = email.toLowerCase();
  const mapped = AVATAR_BY_EMAIL[key];
  if (mapped) return `/petugas/${mapped}.png`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `/petugas/${AVATAR_POOL[h % AVATAR_POOL.length]}.png`;
}

/**
 * Avatar petugas 2.5D pop-out: lingkaran gradient biru sebagai frame, foto
 * (PNG transparan) tampil lebih tinggi dari lingkaran sehingga kepala/pundak
 * "keluar" dari frame; ring putih, glow biru, dan dot status. Foto dari
 * `public/petugas/` (lihat avatarSrc). Bila gagal dimuat → fallback inisial
 * nama di dalam lingkaran; layout tidak rusak.
 */
function StaffAvatar({
  name,
  email,
  active,
  size = "card",
}: {
  name: string;
  email: string;
  active: boolean;
  size?: "card" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const src = avatarSrc(email);
  const big = size === "lg";
  // Tinggi foto > diameter lingkaran → selisihnya jadi "pop-out" kepala.
  const PHOTO_H = big ? 176 : 120;
  const CIRCLE = big ? 116 : 80;
  const headZ = big ? 32 : 22; // kedalaman 3D kepala → parallax saat tilt
  const dot = big ? 20 : 16;

  // Tilt 3D mengikuti mouse → avatar terasa "hidup"/bergaya ke arah kursor.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: px * 24, ry: -py * 20 });
  };
  const reset = () => {
    setHovering(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      className="relative shrink-0"
      style={{ width: CIRCLE, height: PHOTO_H, perspective: 900 }}
      onMouseEnter={() => setHovering(true)}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      <div
        className={cn(
          "absolute inset-0 [transform-style:preserve-3d]",
          !hovering && "animate-float",
        )}
        style={
          hovering
            ? {
                transform: `rotateX(${tilt.ry}deg) rotateY(${tilt.rx}deg) scale(1.05)`,
                transition: "transform .12s ease-out",
              }
            : { transition: "transform .35s ease-out" }
        }
      >
        {/* glow */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 rounded-full bg-blue-500/25 blur-xl"
          style={{ height: CIRCLE }}
        />
        {/* cincin gradient BERPUTAR */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 animate-spin-ring rounded-full [background:conic-gradient(from_0deg,#38bdf8,#3b82f6,#a855f7,#22d3ee,#38bdf8)]"
          style={{ width: CIRCLE + 10, height: CIRCLE + 10, bottom: -5 }}
        />
        {/* pemisah tipis */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-surface"
          style={{ width: CIRCLE + 4, height: CIRCLE + 4, bottom: -2 }}
        />
        {/* frame lingkaran + BADAN (di-clip lengkung lingkaran) */}
        <div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 shadow-lg shadow-blue-500/30"
          style={{ width: CIRCLE, height: CIRCLE }}
        >
          {imgError ? (
            <span
              className="font-extrabold tracking-tight text-white"
              style={{ fontSize: big ? 36 : 20 }}
            >
              {initialsOf(name)}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              aria-hidden
              onError={() => setImgError(true)}
              style={{ height: PHOTO_H }}
              className="absolute bottom-0 left-1/2 w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
            />
          )}
        </div>
        {/* KEPALA pop-out 3D (translateZ → parallax saat tilt) */}
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            onError={() => setImgError(true)}
            style={{
              height: PHOTO_H,
              clipPath: `inset(0 0 ${CIRCLE - 6}px 0)`,
              transform: `translateX(-50%) translateZ(${headZ}px)`,
            }}
            className="pointer-events-none absolute bottom-0 left-1/2 w-auto max-w-none object-contain object-bottom"
          />
        )}
        {/* dot status */}
        <span
          className={cn(
            "absolute z-20 rounded-full ring-2 ring-white dark:ring-surface-elev",
            active ? "bg-emerald-500" : "bg-rose-400",
          )}
          style={{ width: dot, height: dot, bottom: big ? 6 : 4, right: big ? 6 : 4 }}
        />
      </div>
    </div>
  );
}

const STAT_TONE: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  green:
    "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  purple:
    "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
};

function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: keyof typeof STAT_TONE | string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-4 shadow-card ring-1 ring-blue-100/50 backdrop-blur transition hover:shadow-lift dark:border-hairline dark:bg-surface-2/70 dark:ring-hairline">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1",
          STAT_TONE[tone] ?? STAT_TONE.blue,
        )}
      >
        {icon}
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
        {value}
      </p>
      <p className="text-[11px] text-ink-subtle">{sub}</p>
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-blue-100 bg-surface py-2.5 pl-8 pr-8 text-xs font-semibold text-ink outline-none ring-blue-200 transition focus:border-blue-300 focus:ring-2 dark:border-hairline"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}

/** Ilustrasi 3D security di hero. Pakai PNG bila ada (`/petugas/hero-security.png`),
 *  fallback ke emblem CSS/icon agar tak bergantung asset. */
function HeroSecurityArt() {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/petugas/hero-security.png"
        alt=""
        aria-hidden
        onError={() => setImgError(true)}
        className="hidden h-32 w-auto shrink-0 object-contain drop-shadow-[0_14px_22px_rgba(37,99,235,0.3)] xl:block"
      />
    );
  }
  return (
    <div className="relative hidden h-32 w-32 shrink-0 items-center justify-center xl:flex">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-400/30 to-cyan-300/20 blur-2xl" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-600/40 ring-4 ring-white/70">
        <ShieldCheck className="h-12 w-12 text-white" />
        <span className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-md ring-1 ring-blue-100">
          <KeyRound className="h-4 w-4" />
        </span>
        <Sparkles className="absolute -left-2 -top-2 h-5 w-5 text-cyan-300" />
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 transition",
        tone === "danger"
          ? "text-rose-600 ring-rose-100 hover:bg-rose-50 hover:ring-rose-200 dark:ring-rose-500/25 dark:hover:bg-rose-500/10"
          : "text-ink-muted ring-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:ring-hairline dark:hover:bg-surface-2",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function OfficerCard({
  op,
  onDetail,
  onEdit,
  onSetPin,
  onToggleActive,
  onDelete,
}: {
  op: ApiOperator;
  onDetail: () => void;
  onEdit: () => void;
  onSetPin: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const stationTone = op.station
    ? STATION_TONE[op.station] ??
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300"
    : "";
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-br from-white to-sky-50/40 p-4 shadow-card ring-1 ring-white/50 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lift dark:border-hairline dark:from-surface dark:to-surface/70 dark:ring-hairline",
        !op.active && "opacity-75",
      )}
    >
      {/* dekorasi pojok */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/20 blur-2xl transition group-hover:bg-blue-300/30" />

      <div className="relative flex gap-4">
        <StaffAvatar name={op.name} email={op.email} active={op.active} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1",
                ROLE_TONE[op.role] ?? ROLE_TONE.operator,
              )}
            >
              {op.role}
            </span>
            {op.station && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1",
                  stationTone,
                )}
              >
                <MapPin className="h-3 w-3" />
                {STATION_LABEL[op.station] ?? op.station}
              </span>
            )}
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1",
                op.active
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  op.active ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              {op.active ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <h3 className="mt-2 truncate text-base font-extrabold tracking-tight text-ink">
            {op.name}
          </h3>
          <p className="truncate text-xs text-ink-muted">{op.email}</p>
          {op.hasPin && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300">
              <KeyRound className="h-3 w-3" />
              PIN aktif
            </span>
          )}
        </div>
      </div>

      {/* aksi */}
      <div className="relative mt-4 flex flex-wrap items-center gap-1.5 border-t border-blue-50 pt-3 dark:border-hairline">
        <ActionBtn icon={<Eye className="h-3.5 w-3.5" />} label="Detail" onClick={onDetail} />
        <ActionBtn icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={onEdit} />
        <ActionBtn icon={<KeyRound className="h-3.5 w-3.5" />} label="Reset PIN" onClick={onSetPin} />
        <ActionBtn
          icon={<Power className="h-3.5 w-3.5" />}
          label={op.active ? "Nonaktifkan" : "Aktifkan"}
          onClick={onToggleActive}
          tone={op.active ? "danger" : "default"}
        />
        <button
          type="button"
          onClick={onDelete}
          title="Hapus"
          aria-label="Hapus"
          className="ml-auto rounded-lg p-1.5 text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-50 hover:ring-rose-200 dark:ring-rose-500/25 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function OfficerDetail({
  op,
  onEdit,
  onClose,
}: {
  op: ApiOperator;
  onEdit: () => void;
  onClose: () => void;
}) {
  const stationTone = op.station
    ? STATION_TONE[op.station] ??
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300"
    : "";
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-sheet-up overflow-hidden rounded-t-3xl bg-surface shadow-lift ring-1 ring-hairline sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HERO header sinematik */}
        <div className="relative flex flex-col items-center gap-1 overflow-hidden px-5 pb-6 pt-7">
          {/* lapisan gradient beranimasi */}
          <div className="pointer-events-none absolute inset-0 animate-gradient-shift bg-[length:200%_200%] [background-image:linear-gradient(120deg,#dbeafe,#eff6ff,#cffafe,#ede9fe,#dbeafe)] opacity-90 dark:opacity-20" />
          {/* blob mengambang */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 animate-float rounded-full bg-cyan-300/40 blur-2xl" />
          <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 animate-drift rounded-full bg-violet-300/40 blur-2xl" />
          <Sparkles className="pointer-events-none absolute left-6 top-6 h-4 w-4 animate-float text-cyan-400/80" />
          <Sparkles className="pointer-events-none absolute right-10 top-10 h-3 w-3 animate-drift text-violet-400/70" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-3 z-10 rounded-lg bg-white/60 p-1.5 text-ink-muted backdrop-blur transition hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* halo pulse di belakang avatar */}
          <div className="pointer-events-none absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 animate-pulse-glow rounded-full" />
          <div className="relative z-10">
            <StaffAvatar
              name={op.name}
              email={op.email}
              active={op.active}
              size="lg"
            />
          </div>
          <h3 className="relative z-10 mt-2 animate-fade-up text-xl font-extrabold tracking-tight text-ink">
            {op.name}
          </h3>
          <p className="relative z-10 animate-fade-up text-xs text-ink-muted" style={{ animationDelay: "0.05s" }}>
            {op.email}
          </p>
          <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span
              className={cn(
                "inline-flex animate-badge-pop items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                ROLE_TONE[op.role] ?? ROLE_TONE.operator,
              )}
            >
              {op.role}
            </span>
            {op.station && (
              <span
                className={cn(
                  "inline-flex animate-badge-pop items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                  stationTone,
                )}
                style={{ animationDelay: "0.08s" }}
              >
                <MapPin className="h-3 w-3" />
                {STATION_LABEL[op.station] ?? op.station}
              </span>
            )}
            <span
              className={cn(
                "inline-flex animate-badge-pop items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                op.active
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300",
              )}
              style={{ animationDelay: "0.16s" }}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  op.active ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              {op.active ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>

        {/* info rows (stagger) */}
        <div className="space-y-2 px-5 py-4">
          <DetailRow
            icon={<UserCog className="h-4 w-4" />}
            tone="bg-blue-50 text-blue-600 ring-blue-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25"
            label="Peran"
            value={op.role}
            delay="0.04s"
          />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            tone="bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25"
            label="Area / Pos"
            value={op.station ? STATION_LABEL[op.station] ?? op.station : "—"}
            delay="0.1s"
          />
          <DetailRow
            icon={<Activity className="h-4 w-4" />}
            tone={
              op.active
                ? "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25"
                : "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25"
            }
            label="Status"
            value={op.active ? "Aktif" : "Nonaktif"}
            delay="0.16s"
          />
          <DetailRow
            icon={<KeyRound className="h-4 w-4" />}
            tone={
              op.hasPin
                ? "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25"
                : "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25"
            }
            label="PIN"
            value={op.hasPin ? "Sudah diset" : "Belum diset"}
            delay="0.22s"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:from-blue-700 hover:to-blue-800"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
  delay?: string;
}) {
  return (
    <div
      className="flex animate-fade-up items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 ring-1 ring-hairline"
      style={{ animationDelay: delay }}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
          tone,
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <span className="ml-auto text-sm font-bold capitalize text-ink">
        {value}
      </span>
    </div>
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
