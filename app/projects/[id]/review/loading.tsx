import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full">
          <div className="mb-6 flex flex-col gap-2">
            <div className="h-9 w-64 animate-pulse rounded-lg bg-emerald-950/10" />
            <div className="h-6 w-80 animate-pulse rounded bg-emerald-950/5" />
          </div>

          <Card className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-emerald-950/5 p-3"
                >
                  <div className="space-y-1.5">
                    <div className="h-4 w-56 animate-pulse rounded bg-emerald-950/10" />
                    <div className="h-3 w-40 animate-pulse rounded bg-emerald-950/5" />
                  </div>
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-emerald-950/10" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
