// app/projects/[id]/review/page.tsx

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { COLORS } from "@/app/chart.colors";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import ReviewPanel from "./ReviewPanel";

type PageProps = {
  params: { id: string };
};

export default async function ProjectReviewPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/?returnTo=/projects/${id}/review`);
    }

  

  const isAdmin = user.app_metadata?.role === "admin";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,user_id,is_admin_project")
    .eq("id", id)
    .maybeSingle();

  if (projectError) {
    console.error("Error fetching project name:", projectError.message);
  }

  // Projet admin → accessible aux admins seulement
  if (project?.is_admin_project && !isAdmin) {
    redirect("/my-projects");
  }

  // Fallback minimal: si le user client ne voit pas le projet, on lit en admin
  // MAIS on vérifie l'ownership avant d'utiliser le nom (sinon redirect menu).
  let projectName = project?.name?.trim() || "";


  if (!projectName) projectName = "Projet";


  const projectId = id;


  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Content */}
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-3xl font-normal tracking-tight text-emerald-950">
              <span className="text-emerald-600"
               style={{ color: COLORS.green_altopi }}>Projet</span>{" "}
              <span className="font-normal">{projectName}</span>
            </h1>
            <p className="text-xl font-normal"
                style={{ color: COLORS.green_altopi }}>
              Prévalidation des lignes du projet
            </p>
          </div>

          <Card className="p-4">
            <ReviewPanel projectId={projectId} />
          </Card>
        </div>
      </section>
    </main>
  );
}
