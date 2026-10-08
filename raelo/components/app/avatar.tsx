import { cn } from "@/lib/utils";

/** Initials in a coloured circle; used where there's no profile photo. */
export function Avatar({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const initials =
    (name ?? "")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R";

  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-xs font-black text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}
