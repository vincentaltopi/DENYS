"use client";
import Image from "next/image";


import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Détecte les tokens d'invitation / recovery dans le hash de l'URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace("#", ""));
    const type = params.get("type");

    // Supabase SDK détecte automatiquement le hash et crée une session
    // On écoute le changement de session pour rediriger
    if (type === "invite" || type === "recovery") {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
            window.location.href = "/reset-password";
          }
        }
      );
      return () => subscription.unsubscribe();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setErr("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErr("Connexion impossible. Vérifie l’email et le mot de passe.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") ?? "/home";
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  return (
  <main
    className="relative min-h-screen text-emerald-950"
    style={{
      backgroundImage: "url(/images/fond_ecran_denys.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {/* Overlays (contraste + lisibilité) */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/20 to-slate-900/35" />

    {/* Contenu */}
    <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
      <div className="w-full">
        {/* Header (logo + titre) */}
        <div className="mx-auto mb-6 max-w-md text-center text-white">
          {/* Badge pour logo PNG avec fond */}
          <div className="mx-auto mb-4 inline-flex items-center justify-center ">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={220}
              height={110}
              priority
              className="h-auto w-44"
            />
          </div>

          <h1 className="text-2xl font-medium tracking-tight">
            Évaluateur Carbone des Projets
          </h1>
        </div>

        {/* Carte */}
        <div className="mx-auto max-w-md rounded-3xl border border-white/30 bg-white/40 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                placeholder="prenom.nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm outline-none ring-emerald-600/25 placeholder:text-emerald-950/40 focus:bg-white focus:ring-2"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm outline-none ring-emerald-600/25 placeholder:text-emerald-950/40 focus:bg-white focus:ring-2"
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2 text-center">
              <a
                href="/forgot-password"
                className="text-sm font-normal text-emerald-900/70 hover:text-emerald-950"
              >
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={!email || !password || loading}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-normal text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>

            {err && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </div>
            )}

          </form>
        </div>

        {/* Petit footer optionnel */}
        <div className="mx-auto mt-6 max-w-md text-center text-xs text-white/70">
          © {new Date().getFullYear()} Altopi
        </div>
      </div>
    </div>
  </main>
);

}
