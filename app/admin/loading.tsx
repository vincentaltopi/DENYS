import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto max-w-4xl px-6 pt-10 space-y-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-emerald-950/10" />

        <Card>
          <div className="space-y-4">
            <div className="h-5 w-52 animate-pulse rounded bg-emerald-950/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-emerald-950/5" />
            <div className="h-10 w-32 animate-pulse rounded-xl bg-emerald-950/10" />
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="h-5 w-40 animate-pulse rounded bg-emerald-950/10" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-emerald-950/5 p-3"
              >
                <div className="h-4 w-48 animate-pulse rounded bg-emerald-950/10" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-emerald-950/5" />
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
