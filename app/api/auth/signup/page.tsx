"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main className="min-h-[calc(100vh-0px)] px-6 py-10 text-emerald-950">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur">
          <header className="mb-5 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
            <p className="text-sm text-emerald-950/70">
              Crée un accès pour suivre et consolider les bilans des chantiers.
            </p>
          </header>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-emerald-950/80">Email</label>
              <input
                placeholder="prenom.nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-sm outline-none ring-emerald-600/25 placeholder:text-emerald-950/40 focus:ring-2"
                autoComplete="email"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-semibold text-emerald-950/80">Mot de passe</label>
              <input
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-sm outline-none ring-emerald-600/25 placeholder:text-emerald-950/40 focus:ring-2"
                autoComplete="new-password"
              />
            </div>

            <button
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!email || !password}
              onClick={async () => {
                setErr("");
                setMsg("");

                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                });

                if (error) {
                  setErr(error.message || "Impossible de créer le compte");
                  return;
                }

                // Selon ta config Supabase: soit session immédiate, soit email confirmation
                // Si email confirmation ON: tu dois afficher un message.
                setMsg("Compte créé. Vérifie ta boîte mail pour confirmer (si demandé), puis connecte-toi.");
              }}
            >
              Créer le compte
            </button>

            {msg && (
              <div className="rounded-xl border border-emerald-700/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {msg}
              </div>
            )}

            {err && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </div>
            )}

            <p className="pt-2 text-xs text-emerald-950/55">
              Astuce : utilise une adresse pro pour faciliter la gestion en équipe.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
