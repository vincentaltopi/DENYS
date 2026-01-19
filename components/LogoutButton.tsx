"use client";

import { supabase } from "@/lib/supabaseClient";

type LogoutButtonProps = {
  iconOnly?: boolean;
};

export default function LogoutButton({ iconOnly = false }: LogoutButtonProps) {
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      type="button"
      aria-label="Se déconnecter"
      className={
        iconOnly
          ? "flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-950/15 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          : "inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-semibold text-emerald-950/70 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      }
    >
      {iconOnly ? (
        /* Icône power */
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="red"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12 2v10" />
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        </svg>
      ) : (
        "Se déconnecter"
      )}
    </button>
  );
}
