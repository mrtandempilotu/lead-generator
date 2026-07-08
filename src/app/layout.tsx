import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { computeLeadScore, scoreTier } from "@/lib/lead-score";

export const metadata: Metadata = {
  title: "GermanLead AI",
  description:
    "Find and manage B2B leads with verified emails across Germany.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Notification dot on the header bell icon: shown when there's at least one
  // "Hot" lead (from real data — not a fake flag).
  let hasNotification = false;
  if (user) {
    const serviceClient = getSupabaseServerClient();
    if (serviceClient) {
      const { data: rows } = await serviceClient
        .from("leads")
        .select("email_verification_status, website, phone, rating, ratings_total, closed")
        .eq("user_id", user.id)
        .limit(500);
      hasNotification = (rows ?? []).some(
        (r) => scoreTier(computeLeadScore(r)) === "heiss"
      );
    }
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-zinc-900">
        <Header userEmail={user?.email ?? null} hasNotification={hasNotification} />
        <div className="flex-1 pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
