import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";
import { COLORS } from "@/app/chart.colors";

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

  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();
  const isAdmin = user.app_metadata?.role === "admin";

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      {/* Top bar */}
      <header className="border-b border-emerald-700/30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-10">
            <Link href="/home" className="inline-flex items-center">
              <Image
                src="/images/LOGO_ALTOPI.png"
                alt="Altopi"
                width={120}
                height={40}
                priority
                className="h-auto w-44 cursor-pointer"
              />
            </Link>
            <div className="text-xl font-normal" style={{ color: COLORS.green_altopi }}>
              Évaluateur Carbone des Projets
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AccountMenu name={name} email={email} initial={initial} isAdmin={isAdmin} />
            <LogoutButton iconOnly />
          </div>
        </div>
      </header>

      {/* Page content */}
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-normal tracking-tight">Mon compte</h1>
          </div>

          <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
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
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-950"
                >
                  Changer mon mot de passe
                </a>
                <a
                  href="/home"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-medium text-emerald-950/70 hover:bg-emerald-50"
                >
                  Retour
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
