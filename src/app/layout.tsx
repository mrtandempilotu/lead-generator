import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { computeLeadScore, scoreTier } from "@/lib/lead-score";

export const metadata: Metadata = {
  title: "BerlinLead AI",
  description:
    "Almanya'da doğrulanmış e-postalı B2B lead'ler bulun ve yönetin.",
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

  // Başlıktaki zil ikonundaki bildirim noktası: en az bir "Heiss" lead varsa
  // gösterilir (gerçek veriden — sahte bir bayrak değil).
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
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-zinc-900">
        <Header userEmail={user?.email ?? null} hasNotification={hasNotification} />
        <div className="flex-1 pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
