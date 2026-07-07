"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Arama" },
  { href: "/leads", label: "CRM" },
  { href: "/settings", label: "Ayarlar" },
];

export default function NavBar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            BerlinLead <span className="text-indigo-600">AI</span>
          </span>
          <div className="flex gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname === l.href
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100"
          >
            Çıkış
          </button>
        </div>
      </div>
    </nav>
  );
}
