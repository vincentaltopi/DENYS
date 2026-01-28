import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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
    <main className="min-h-screen bg-white px-6 py-10 text-emerald-950">
      
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mon compte</h1>
          <p className="text-sm text-emerald-950/60">
            Informations de profil et accès.
          </p>
        </header>

        <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm">
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
                className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
              >
                Changer mon mot de passe
              </a>

              <a
                href="/home"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-semibold text-emerald-950/70 hover:bg-emerald-50"
              >
                Retour
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
