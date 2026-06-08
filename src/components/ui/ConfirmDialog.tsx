"use client";

import * as React from "react";
import {
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Modal, ModalTone } from "./Modal";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  tone?: ModalTone;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  /** Optional reason field — when set, returned via the resolved value */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  reason?: string;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<ConfirmResult>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

const defaultIconFor = (tone: ModalTone | undefined): React.ReactNode => {
  switch (tone) {
    case "danger":
      return <ShieldAlert className="h-5 w-5" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5" />;
    case "success":
      return <CheckCircle2 className="h-5 w-5" />;
    case "brand":
      return <Sparkles className="h-5 w-5" />;
    default:
      return <HelpCircle className="h-5 w-5" />;
  }
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    opts: ConfirmOptions | null;
    resolve: ((r: ConfirmResult) => void) | null;
  }>({ open: false, opts: null, resolve: null });
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState<string | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    return new Promise<ConfirmResult>((resolve) => {
      setReason("");
      setReasonError(null);
      setState({ open: true, opts, resolve });
    });
  }, []);

  const close = (confirmed: boolean) => {
    if (
      confirmed &&
      state.opts?.requireReason &&
      reason.trim() === ""
    ) {
      setReasonError("Wajib diisi");
      return;
    }
    state.resolve?.({
      confirmed,
      reason: state.opts?.requireReason ? reason.trim() : undefined,
    });
    setState({ open: false, opts: null, resolve: null });
  };

  const opts = state.opts;
  const tone = opts?.tone ?? (opts?.destructive ? "danger" : "warning");
  const icon = opts?.icon ?? defaultIconFor(tone);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={state.open}
        onClose={() => close(false)}
        title={opts?.title}
        description={opts?.description}
        icon={icon}
        tone={tone}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => close(false)}
            >
              {opts?.cancelLabel ?? "Batal"}
            </Button>
            <Button
              variant={opts?.destructive || tone === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={() => close(true)}
              autoFocus={!opts?.requireReason}
            >
              {opts?.confirmLabel ?? "Lanjutkan"}
            </Button>
          </>
        }
      >
        {opts?.requireReason && (
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-ink-muted">
              {opts.reasonLabel ?? "Alasan"}
              <span className="text-rose-500"> *</span>
            </span>
            <input
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder={opts.reasonPlaceholder ?? "Tulis alasan singkat…"}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-hairline dark:bg-surface dark:text-ink dark:placeholder:text-ink-subtle dark:hover:border-sky-500/40 dark:focus:border-sky-400 dark:focus:ring-sky-500/30"
            />
            {reasonError && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {reasonError}
              </span>
            )}
          </label>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}
