// page.tsx
import UploadButton from "./UploadButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(900px_500px_at_15%_10%,#dcfce7_0%,transparent_60%),linear-gradient(#f7f6f2,#f7f6f2)] px-6 py-10 text-emerald-950">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur">
          <header className="mb-5 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Upload input</h1>
            <p className="text-sm text-emerald-950/70">
              Choisir un fichier <span className="font-medium">.xlsx</span>,{" "}
              <span className="font-medium">.xlsb</span> ou{" "}
              <span className="font-medium">.xls</span>
            </p>
          </header>

          <UploadButton />


        </div>
      </div>
    </main>
  );
}


