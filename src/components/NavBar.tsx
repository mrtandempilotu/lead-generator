"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Arama" },
  { href: "/leads", label: "CRM" },
  { href: "/map", label: "Harita" },
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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight text-white">
            BerlinLead <span className="text-indigo-400">AI</span>
          </span>
          <div className="flex gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname === l.href
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
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
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10"
          >
            Çıkış
          </button>
        </div>
      </div>
    </nav>
  );
}
