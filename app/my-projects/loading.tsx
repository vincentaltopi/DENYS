import AppHeader from "@/components/AppHeader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto max-w-3xl px-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-emerald-950/10" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-emerald-950/10" />
        </div>

        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-emerald-950/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-5 w-48 animate-pulse rounded bg-emerald-950/10" />
                  <div className="h-3 w-32 animate-pulse rounded bg-emerald-950/5" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-emerald-950/10" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
