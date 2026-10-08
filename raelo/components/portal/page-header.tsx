export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-[34px]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-black/55">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
