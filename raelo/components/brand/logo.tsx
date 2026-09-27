import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ed1c24] text-xl font-black text-white">
        R
      </span>
      <span className="text-xl font-bold text-[#ed1c24]">Raelo</span>
    </Link>
  );
}
