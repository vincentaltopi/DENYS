import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full">
          <div className="mb-6">
            <div className="h-9 w-64 animate-pulse rounded-lg bg-emerald-950/10" />
            <div className="mt-4 flex items-center justify-between">
              <div className="h-6 w-24 animate-pulse rounded bg-emerald-950/5" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-emerald-950/10" />
            </div>
          </div>

          <Card className="p-5">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-48 w-48 animate-pulse rounded-full bg-emerald-950/5" />
              <div className="w-full space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                  >
                    <div className="h-4 w-40 animate-pulse rounded bg-emerald-950/10" />
                    <div className="h-4 w-20 animate-pulse rounded bg-emerald-950/5" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
