"use client";
import AuthShell from "@/components/auth/AuthShell";
import Image from "next/image";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) return;

    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });

      if (error) {
        setErr(error.message || "Impossible d’envoyer l’email");
        return;
      }

      setMsg(
        "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."
      );
    } finally {
      setLoading(false);
    }
  }

return (
  <AuthShell>
    <div className="w-full">
      {/* Header (logo + titre) */}
      <div className="mx-auto mb-6 max-w-md text-center text-white">
        <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-3xl bg-white/85 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.25)] ring-1 ring-white/30">
          <Image
            src="/images/LOGO_ALTOPI.png"
            alt="Altopi"
            width={220}
            height={110}
            priority
            className="h-auto w-44"
          />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Mot de passe oublié
        </h1>
      </div>

      {/* Carte */}
      <div className="mx-auto max-w-md rounded-3xl border border-white/30 bg-white/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <p className="text-sm text-emerald-950/70">
          Indique ton email et on t’envoie un lien de réinitialisation.
        </p>

        <div className="mt-4 grid gap-3">
          <input
            placeholder="prenom.nom@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm outline-none ring-emerald-600/25 placeholder:text-emerald-950/40 focus:bg-white focus:ring-2"
            autoComplete="email"
          />

          <button
            onClick={handleReset}
            disabled={!email || loading}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Envoi…" : "Envoyer le lien"}
          </button>

          {msg && (
            <div className="rounded-2xl border border-emerald-700/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {msg}
            </div>
          )}

          {err && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}

          <div className="pt-1 text-center">
            <a
              href="/"
              className="text-sm font-semibold text-emerald-900/70 hover:text-emerald-950"
            >
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-md text-center text-xs text-white/70">
        © {new Date().getFullYear()} Altopi
      </div>
    </div>
  </AuthShell>
);

}
