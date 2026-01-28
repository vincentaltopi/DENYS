import Image from "next/image";

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mx-auto mb-6 max-w-md text-center text-white">
          <div className="mx-auto mb-4 inline-flex items-center justify-center ">
            <Image
              src="/images/LOGO_ALTOPI.png"
              alt="Altopi"
              width={220}
              height={110}
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
