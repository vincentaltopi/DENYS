import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AppHeader from "@/components/AppHeader";


export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protégée : si pas connecté => retour au login (/)
  if (!user) redirect("/");

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Center content */}
      <section className="animate-fade-in-up mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-3xl font-medium tracking-tight text-emerald-950">
            Bienvenue
          </h1>

          <div className="mx-auto mt-8 grid max-w-md gap-4">
            <a
              href="/upload"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              Commencer un nouveau projet
            </a>

            <a
              href="/my-projects"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-5 py-3 text-sm font-medium text-emerald-950 shadow-sm transition hover:bg-emerald-50 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              Consulter mes projets
            </a>

          </div>
        </div>
      </section>
    </main>
  );
}
