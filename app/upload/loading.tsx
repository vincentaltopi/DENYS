import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-emerald-950">
      <AppHeader />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-start justify-center px-6 pt-10">
        <div className="w-full max-w-3xl">
          <div className="mb-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-emerald-950/10" />
          </div>

          <Card>
            <div className="space-y-4">
              <div className="h-5 w-32 animate-pulse rounded bg-emerald-950/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-emerald-950/5" />
              <div className="h-5 w-40 animate-pulse rounded bg-emerald-950/10" />
              <div className="h-32 w-full animate-pulse rounded-xl bg-emerald-950/5" />
              <div className="h-10 w-36 animate-pulse rounded-xl bg-emerald-950/10" />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
