import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";
import { PortalNav } from "@/components/portal/portal-nav";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Logo href="/portal" />
          <LogoutButton />
        </div>
        <div className="mx-auto max-w-5xl px-6">
          <PortalNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
