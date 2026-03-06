import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-emerald-950/10" />
          </div>

          <Card>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-12 animate-pulse rounded bg-emerald-950/10" />
                <div className="h-4 w-36 animate-pulse rounded bg-emerald-950/10" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-14 animate-pulse rounded bg-emerald-950/10" />
                <div className="h-4 w-48 animate-pulse rounded bg-emerald-950/10" />
              </div>
              <div className="pt-2 flex gap-3">
                <div className="h-10 w-52 animate-pulse rounded-xl bg-emerald-950/10" />
                <div className="h-10 w-24 animate-pulse rounded-xl bg-emerald-950/5" />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
