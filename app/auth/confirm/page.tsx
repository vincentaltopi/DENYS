export default function ConfirmPage() {
  return (
    <main className="min-h-screen px-6 py-10 text-emerald-950">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight">Email confirmé</h1>
          <p className="mt-2 text-sm text-emerald-950/70">
            Ton email est confirmé. Tu peux maintenant te connecter.
          </p>

          <div className="mt-4">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
            >
              Aller à la connexion
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
