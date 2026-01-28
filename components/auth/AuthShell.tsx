type AuthShellProps = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main
      className="relative min-h-screen"
      style={{
        backgroundImage: "url(/images/fond_ecran_denys.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/25 to-slate-950/45" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}
