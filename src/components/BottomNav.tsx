"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Mail,
  MessageCircle,
  CreditCard,
  Settings as SettingsIcon,
  Search,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/email", label: "E-Mail", icon: Mail },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/preise", label: "Preise", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  return (
    <>
      {/* Yeni arama için yüzen aksiyon düğmesi — 6 sekmelik alt navigasyonda
          yer olmadığı için buraya taşındı. */}
      {pathname !== "/search" && (
        <button
          type="button"
          onClick={() => router.push("/search")}
          aria-label="Yeni arama"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-6 sm:max-w-2xl">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition ${
                  active ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Not: çıkış (logout) işlemi artık Ayarlar sayfasında; burada tutmuyoruz ki
// mockup'taki 6 sekmelik sade alt bar korunsun.
export async function signOutAndRedirect(router: ReturnType<typeof useRouter>) {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
}
