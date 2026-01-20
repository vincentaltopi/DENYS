import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protégée : si pas connecté => retour au login (/)
  if (!user) redirect("/");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";

  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="border-b border-emerald-700/30">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: logo + app title */}
          <div className="flex items-center gap-10">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={120}
              height={40}
              priority
              className="h-auto w-44"
            />

            <div className="leading-tight">
              <div className="text-lg font-normal text-emerald-800">
                Évaluateur Carbone des Projets
              </div>
            </div>
          </div>

          {/* Right: account menu */}
          <div className="flex items-center gap-3">
            <AccountMenu name={name} email={email} initial={initial} />

            {/* Bouton logout à côté (style icône) */}
            <div className="rounded-xl border border-emerald-950/10 bg-white p-2 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
              <LogoutButton iconOnly />
            </div>
          </div>
        </div>
      </header>

      {/* Center content */}
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-20">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-4xl font-normal tracking-tight text-slate-900">
            Bienvenue
          </h1>

          <div className="mx-auto mt-8 grid max-w-md gap-3">
            <a
              href="/upload"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              Commencer un nouveau projet
            </a>

            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-400 shadow-sm"
            >
              Consulter mes projets (bientôt)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
