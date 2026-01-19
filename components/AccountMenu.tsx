"use client";

import { useEffect, useRef, useState } from "react";


type AccountMenuProps = {
  name: string;
  email: string;
  initial: string;
};

export default function AccountMenu({ name, email, initial }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 shadow-sm transition hover:bg-emerald-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
          {initial}
        </div>

        <div className="hidden sm:block max-w-[160px] text-left">
          <p className="truncate text-xs font-semibold text-emerald-950">
            {name}
          </p>
          <p className="truncate text-[11px] text-emerald-950/60">{email}</p>
        </div>

        <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4 text-emerald-950/50"
        fill="currentColor"
        >
        <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
            clipRule="evenodd"
        />
        </svg>

      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
        >
          <div className="px-4 py-3">
            <p className="truncate text-sm font-semibold text-emerald-950">
              {name}
            </p>
            <p className="truncate text-xs text-emerald-950/60">{email}</p>
          </div>

          <div className="h-px bg-emerald-950/10" />

          <a
            role="menuitem"
            href="/account"
            className="block px-4 py-2 text-sm text-emerald-950/80 hover:bg-emerald-50"
            onClick={() => setOpen(false)}
          >
            Mon compte
          </a>

          <a
            role="menuitem"
            href="/forgot-password"
            className="block px-4 py-2 text-sm text-emerald-950/80 hover:bg-emerald-50"
            onClick={() => setOpen(false)}
          >
            Changer mon mot de passe
          </a>


        </div>
      )}
    </div>
  );
}
