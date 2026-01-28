import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function MyProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, status, batch_id, created_at")
    .eq("id", params.projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      </main>
    );
  }

  if (!project) notFound();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/my-projects"
          className="text-emerald-700 hover:underline"
        >
          ← Mes projets
        </Link>

        <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-medium">
            {project.name || "Projet"}
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Créé le{" "}
            {new Date(project.created_at).toLocaleDateString("fr-FR")}
          </p>

          <div className="mt-6 space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Statut :</span>{" "}
              {project.status}
            </div>

            {project.batch_id && (
              <div>
                <span className="text-slate-500">Batch n8n :</span>{" "}
                {project.batch_id}
              </div>
            )}
          </div>

          {/* 👉 futur : relancer un workflow n8n à partir de batch_id */}
        </div>
      </div>
    </main>
  );
}
