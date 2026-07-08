"use client";

import { usePathname } from "next/navigation";
import { Bell, Globe } from "lucide-react";

export default function Header({
  userEmail,
  hasNotification,
}: {
  userEmail: string | null;
  hasNotification: boolean;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-white shadow-sm">
            <Globe className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">
              BerlinLead <span className="text-indigo-600">AI</span>
            </p>
            {userEmail && (
              <p className="hidden text-[11px] text-zinc-400 sm:block">{userEmail}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Active
          </span>
          <span className="relative text-zinc-500">
            <Bell className="h-5 w-5" />
            {hasNotification && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
