import { createSupabaseServerClient } from "@/lib/supabaseServer";

type ProfileProps = {
  compact?: boolean;
};

export default async function Profile({ compact = false }: ProfileProps) {
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

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    "";

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="hidden sm:block max-w-[160px]">
          <p className="truncate text-xs font-semibold text-emerald-950">
            {name}
          </p>
          <p className="truncate text-[11px] text-emerald-950/60">
            {user.email}
          </p>
        </div>
      </div>
    );
  }

  // 👉 version “grande” inchangée (si tu l’utilises ailleurs)
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-emerald-950/10 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="h-12 w-12 overflow-hidden rounded-full border border-emerald-950/15 bg-emerald-50" />
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-emerald-950">
          {name}
        </h2>
        <p className="truncate text-xs text-emerald-950/65">
          {user.email}
        </p>
      </div>
    </div>
  );
}
