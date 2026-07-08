"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Search,
  Users,
  Mail,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

// Settings is intentionally left out of the nav for now (hidden, not
// removed) — the page at /settings still exists and works, just isn't
// linked from here.
const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/search", label: "Search", icon: Search },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/email", label: "Email", icon: Mail },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/preise", label: "Pricing", icon: CreditCard },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-6 sm:max-w-2xl">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[9px] transition ${
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
  );
}

// Note: sign out lives on the Settings page, not here.
export async function signOutAndRedirect(router: ReturnType<typeof useRouter>) {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
}
