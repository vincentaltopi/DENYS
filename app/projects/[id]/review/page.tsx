// app/projects/[id]/review/page.tsx

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { COLORS } from "@/app/chart.colors";

import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";
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

    // Sécurité : on récupère le projet de CE user uniquement
  // 1) Requête actuelle (id + user) — inchangée
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError) {
    console.error("Error fetching project name:", projectError.message);
  }

  // Fallback minimal: si le user client ne voit pas le projet, on lit en admin
  // MAIS on vérifie l'ownership avant d'utiliser le nom (sinon redirect menu).
  let projectName = project?.name?.trim() || "";

  if (!projectName) {
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from("projects")
      .select("id,name,user_id")
      .eq("id", id)
      .maybeSingle();

    if (adminErr || !adminRow) {
      redirect("/home");
    }

    // sécurité : on ne révèle rien si pas owner
    if (String(adminRow.user_id) !== String(user.id)) {
      redirect("/home");
    }

    projectName = adminRow.name?.trim() || "";
  }

  if (!projectName) projectName = "Projet";


  const projectId = id;


  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";

  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      {/* Top bar (comme Home) */}
      <header className="border-b border-emerald-700/30">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: logo + app title */}
          <div className="flex items-center gap-10">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={120}
              height={40}
              priority
              className="h-auto w-44"
            />

            <div className="leading-tight">
              <div className="text-xl font-normal"
                style={{ color: COLORS.green_altopi }}>
                Évaluateur Carbone des Projets
              </div>
            </div>
          </div>

          {/* Right: account menu + logout */}
          <div className="flex items-center gap-3">
            <AccountMenu name={name} email={email} initial={initial} />
            <LogoutButton iconOnly />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-3xl font-normal tracking-tight text-emerald-950">
              <span className="text-emerald-600">Projet</span>{" "}
              <span className="font-normal">{projectName}</span>
            </h1>
            <p className="text-xl font-normal"
                style={{ color: COLORS.green_altopi }}>
              Prévalidation des lignes du projet
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <ReviewPanel projectId={projectId} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <a
                href="/upload"
                className="inline-flex items-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-medium text-emerald-950/80 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                ← Retour à l’upload
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
