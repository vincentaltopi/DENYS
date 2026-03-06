import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Page content */}
      <section className="animate-fade-in-up mx-auto max-w-6xl px-6 pt-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight">Mon compte</h1>
          </div>

          <Card>
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-950/60">Nom</div>
                <div className="text-sm font-semibold">{name}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-emerald-950/60">Email</div>
                <div className="text-sm">{user.email}</div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href="/forgot-password"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-950 active:scale-[0.97]"
                >
                  Changer mon mot de passe
                </a>
                <a
                  href="/home"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-medium text-emerald-950/70 transition hover:bg-emerald-50 active:scale-[0.97]"
                >
                  Retour
                </a>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
