import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
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

  // Récupérer la liste des utilisateurs
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const users = usersData?.users ?? [];

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 pt-10 space-y-8">
        <h1 className="text-2xl font-medium tracking-tight">Administration</h1>

        {/* Invite card */}
        <Card>
          <h2 className="text-base font-semibold mb-4">Inviter un utilisateur</h2>
          <InviteForm />
        </Card>

        {/* Users list */}
        <Card>
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
        </Card>
      </section>
    </main>
  );
}
