"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lock, X, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_KEY = "gnomo-profit-unlocked";

type Ctx = { unlocked: boolean; requestUnlock: () => void; lock: () => void };
const ProfitLockContext = createContext<Ctx>({ unlocked: false, requestUnlock: () => {}, lock: () => {} });

export function useProfitLock() { return useContext(ProfitLockContext); }

export function ProfitLockProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [modal,    setModal]    = useState(false);

  // Se mantiene desbloqueado solo durante la sesión del navegador
  useEffect(() => {
    try { if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true); } catch {}
  }, []);

  function setAndStore(v: boolean) {
    setUnlocked(v);
    try {
      if (v) sessionStorage.setItem(STORAGE_KEY, "1");
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return (
    <ProfitLockContext.Provider value={{
      unlocked,
      requestUnlock: () => setModal(true),
      lock: () => setAndStore(false),
    }}>
      {children}
      {modal && (
        <UnlockModal
          onClose={() => setModal(false)}
          onUnlocked={() => { setAndStore(true); setModal(false); }}
        />
      )}
    </ProfitLockContext.Provider>
  );
}

/* Muestra el contenido solo si las ganancias están desbloqueadas */
export function Hidden({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { unlocked, requestUnlock } = useProfitLock();
  if (unlocked) return <>{children}</>;
  return (
    <button type="button" onClick={requestUnlock} title="Ver ganancias"
      className={`inline-flex items-center gap-1 text-muted hover:text-[rgb(var(--text))] ${className}`}>
      <Lock size={12} /> Q••••
    </button>
  );
}

/* Bloque completo oculto (desgloses, tablas) */
export function HiddenBlock({ children }: { children: React.ReactNode }) {
  const { unlocked, requestUnlock } = useProfitLock();
  if (unlocked) return <>{children}</>;
  return (
    <button type="button" onClick={requestUnlock}
      className="w-full flex items-center justify-center gap-2 py-6 text-sm text-muted hover:text-[rgb(var(--text))]">
      <Lock size={14} /> Ingresa la contraseña para ver las ganancias
    </button>
  );
}

function UnlockModal({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: () => void }) {
  const [mode,    setMode]    = useState<"unlock" | "change">("unlock");
  const [pass,    setPass]    = useState("");
  const [newPass, setNewPass] = useState("");
  const [error,   setError]   = useState("");
  const [busy,    setBusy]    = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    if (mode === "unlock") {
      const { data, error } = await supabase.rpc("check_profit_password", { p_password: pass });
      setBusy(false);
      if (error) { setError(error.message); return; }
      if (data === true) onUnlocked();
      else setError("Contraseña incorrecta");
    } else {
      const { data, error } = await supabase.rpc("change_profit_password", { p_old: pass, p_new: newPass });
      setBusy(false);
      if (error) { setError(error.message); return; }
      if (data === true) { alert("Contraseña actualizada"); onUnlocked(); }
      else setError("La contraseña actual es incorrecta");
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            {mode === "unlock" ? <><Lock size={16} /> Ver ganancias</> : <><KeyRound size={16} /> Cambiar contraseña</>}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-[rgb(var(--text))]"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">{mode === "unlock" ? "Contraseña" : "Contraseña actual"}</label>
            <input type="password" className="input w-full" autoFocus value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          {mode === "change" && (
            <div>
              <label className="text-xs text-muted block mb-1">Contraseña nueva</label>
              <input type="password" className="input w-full" value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <button onClick={submit} disabled={busy || !pass || (mode === "change" && !newPass)}
          className="btn btn-primary w-full mt-5">
          {busy ? "Verificando…" : mode === "unlock" ? "Desbloquear" : "Guardar contraseña"}
        </button>
        <button onClick={() => { setMode(mode === "unlock" ? "change" : "unlock"); setError(""); }}
          className="text-xs text-muted hover:text-[rgb(var(--text))] w-full mt-3">
          {mode === "unlock" ? "Cambiar contraseña" : "Volver"}
        </button>
      </div>
    </div>
  );
}
