import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { COLORS } from "@/app/chart.colors";
import AccountMenu from "@/components/AccountMenu";
import LogoutButton from "@/components/LogoutButton";

export default async function AppHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Utilisateur";

  const email = user.email ?? "";
  const initial = name.charAt(0).toUpperCase();
  const isAdmin = user.app_metadata?.role === "admin";

  return (
    <header className="relative z-20 border-b border-emerald-700/30">
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
          <AccountMenu name={name} email={email} initial={initial} isAdmin={isAdmin} />
          <LogoutButton iconOnly />
        </div>
      </div>
    </header>
  );
}
