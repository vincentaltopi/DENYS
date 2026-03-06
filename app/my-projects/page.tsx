import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ProjectActions from "@/components/ProjectActions";
import AppHeader from "@/components/AppHeader";

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
    case "failed":
      return {
        label: "Échoué",
        className: "bg-red-100 text-red-800 border border-red-200",
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
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/");

  const isAdmin = user.app_metadata?.role === "admin";

  // Les admins voient tous les projets ; les non-admins ne voient pas les projets admin
  let query = supabase
    .from("projects")
    .select("id, name, status, created_at, created_by_email, user_id, is_admin_project, error_message")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("is_admin_project", false);
  }

  const { data: projects, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen bg-white text-emerald-950 p-6">
        <p className="text-sm text-red-700">
          Erreur de chargement : {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Content */}
      <section className="animate-fade-in-up mx-auto max-w-3xl px-6 pt-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium tracking-tight">Mes projets</h1>

          <Link
            href="/upload"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 active:scale-[0.97]"
          >
            Nouveau projet
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {(projects ?? []).length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-emerald-950/10 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              </div>
              <p className="text-base font-medium text-emerald-950">Aucun projet pour le moment</p>
              <p className="mt-1 text-sm text-emerald-950/50">Créez votre premier projet pour commencer une évaluation carbone.</p>
            </div>
          ) : (
            projects!.map((project: any) => {
              const status = String(project.status ?? "").toLowerCase();
              const statusUI = getStatusUI(status);

              const href =
                status === "ready"
                  ? `/projects/${project.id}/review`
                  : status === "locked"
                  ? `/projects/${project.id}/results`
                  : null;


              return (
                <div
                  key={project.id}
                  className={[
                    "relative rounded-xl border bg-white p-4 shadow-sm",
                    project.is_admin_project ? "border-emerald-300" : "",
                    status === "failed" ? "border-red-200" : "",
                    href
                      ? "transition hover:bg-slate-50"
                      : status === "failed"
                      ? ""
                      : "opacity-60 cursor-not-allowed",
                  ].join(" ")}
                >
                  {/* Overlay cliquable sur toute la carte */}
                  {href ? (
                    <Link
                      href={href}
                      aria-label={`Ouvrir ${project.name || "Projet sans nom"}`}
                      className="absolute inset-0 z-0 rounded-xl"
                    />
                  ) : null}

                  {/* Contenu : on laisse passer les clics vers l’overlay */}
                  <div className="relative z-10 pointer-events-none">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-base font-medium">
                          {project.name || "Projet sans nom"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Créé le{" "}
                          {new Date(project.created_at).toLocaleDateString(
                            "fr-FR"
                          )}
                          {project.created_by_email && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              Créé par {project.created_by_email}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && project.is_admin_project && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                            Admin
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusUI.className}`}
                        >
                          {statusUI.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message d’erreur pour les projets échoués */}
                  {status === "failed" && project.error_message && (
                    <div className="relative z-10 pointer-events-none mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-xs text-red-700">
                        {project.error_message}
                      </p>
                    </div>
                  )}

                  {/* Actions : au-dessus de l’overlay + cliquables */}
                  <div className="relative z-20 mt-3 flex items-center justify-end pointer-events-auto">
                    <ProjectActions
                      projectId={String(project.id)}
                      currentName={project.name || "Projet sans nom"}
                      disabled={status === "processing" }
                    />
                  </div>
                </div>
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
