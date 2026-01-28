// app/upload/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";
import UploadForm from "./UploadForm";
import {COLORS} from "@/app/chart.colors"

export default async function UploadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // route protégée
  if (!user) redirect("/?returnTo=/upload");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";

  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

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

      {/* Page content */}
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-normal tracking-tight">
              Nouveau projet
            </h1>
          </div>

          {/* Main card */}
          <div className="rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <UploadForm />
          </div>
        </div>
      </section>
    </main>
  );
}
