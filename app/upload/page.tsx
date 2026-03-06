// app/upload/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UploadForm from "./UploadForm";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default async function UploadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // route protégée
  if (!user) redirect("/?returnTo=/upload");

  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      {/* Page content */}
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight">
              Nouveau projet
            </h1>
          </div>

          <Card>
            <UploadForm />
          </Card>
        </div>
      </section>
    </main>
  );
}
