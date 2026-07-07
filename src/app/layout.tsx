import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

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

  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-zinc-900">
        <NavBar userEmail={user?.email ?? null} />
        {children}
      </body>
    </html>
  );
}
