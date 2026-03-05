import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";
import { COLORS } from "@/app/chart.colors";
import InviteForm from "./InviteForm";
import UsersList from "./UsersList";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || user.app_metadata?.role !== "admin") {
    redirect("/home");
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";
  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  // Récupérer la liste des utilisateurs
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const users = usersData?.users ?? [];

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
            <AccountMenu name={name} email={email} initial={initial} isAdmin />
            <LogoutButton iconOnly />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 pt-10 space-y-8">
        <h1 className="text-2xl font-normal tracking-tight">Administration</h1>

        {/* Invite card */}
        <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold mb-4">Inviter un utilisateur</h2>
          <InviteForm />
        </div>

        {/* Users list */}
        <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold mb-4">
            Utilisateurs ({users.length})
          </h2>
          <UsersList
            initialUsers={users.map((u) => ({
              id: u.id,
              email: u.email,
              role: u.app_metadata?.role === "admin" ? "admin" : "user",
              created_at: u.created_at,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
