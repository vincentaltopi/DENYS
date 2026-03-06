interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "p-6" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-emerald-950/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}
