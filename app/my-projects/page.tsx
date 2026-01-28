import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";
import { COLORS } from "@/app/chart.colors";

function getStatusUI(status: string) {
  switch (status) {
    case "processing":
      return {
        label: "En cours",
        className: "bg-slate-100 text-slate-600 border border-slate-200",
      };
    case "ready":
      return {
        label: "Prêt",
        className: "bg-amber-100 text-amber-800 border border-amber-200",
      };
    case "locked":
      return {
        label: "Terminé",
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-600 border border-slate-200",
      };
  }
}

export default async function MyProjectsPage() {
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

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
        <p className="text-sm text-red-700">
          Erreur de chargement : {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="border-b border-emerald-700/30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-10">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={120}
              height={40}
              priority
              className="h-auto w-44"
            />

            <div
              className="text-xl font-normal"
              style={{ color: COLORS.green_altopi }}
            >
              Évaluateur Carbone des Projets
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AccountMenu name={name} email={email} initial={initial} />
            <LogoutButton iconOnly />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">Mes projets</h1>

          <Link
            href="/upload"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Nouveau projet
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {(projects ?? []).length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">
              Aucun projet pour le moment.
            </div>
          ) : (
            projects!.map((project) => {
              const status = String(project.status ?? "").toLowerCase();
              const statusUI = getStatusUI(status);

              const href =
                status === "ready"
                  ? `/projects/${project.id}/review`
                  : status === "locked"
                  ? `/projects/${project.id}/results`
                  : null;

              const CardContent = (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-medium">
                      {project.name || "Projet sans nom"}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Créé le{" "}
                      {new Date(project.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusUI.className}`}
                  >
                    {statusUI.label}
                  </span>
                </div>
              );

              if (!href) {
                return (
                  <div
                    key={project.id}
                    className="cursor-not-allowed rounded-xl border bg-white p-4 opacity-60"
                  >
                    {CardContent}
                  </div>
                );
              }

              return (
                <Link
                  key={project.id}
                  href={href}
                  className="block rounded-xl border bg-white p-4 shadow-sm transition hover:bg-slate-50"
                >
                  {CardContent}
                </Link>
              );
            })
          )}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-emerald-700 hover:underline"
        >
          ← Retour accueil
        </Link>
      </section>
    </main>
  );
}
