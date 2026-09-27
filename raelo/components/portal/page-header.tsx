export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
