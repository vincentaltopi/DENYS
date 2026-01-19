import Image from "next/image";

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mx-auto mb-6 max-w-md text-center text-white">
      <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-3xl bg-white/85 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.25)] ring-1 ring-white/30">
        <Image
          src="/LOGO ALTOPI.png"
          alt="Altopi"
          width={200}
          height={100}
          priority
          className="h-auto w-44"
        />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      {subtitle && (
        <p className="mt-1 text-sm text-white/80">{subtitle}</p>
      )}
    </div>
  );
}
