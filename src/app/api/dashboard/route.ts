import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

export async function GET() {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase yapılandırılmamış." },
      { status: 500 }
    );
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "id, name, category, search_city, email, email_verification_status, lead_status, phone, website, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const rows = leads ?? [];
  const totalCompanies = rows.length;
  const verifiedEmails = rows.filter(
    (l) => l.email_verification_status === "valid"
  ).length;
  const fullyQualified = rows.filter(
    (l) => l.email_verification_status === "valid" && l.phone && l.website
  ).length;
  const contactQualityScore =
    totalCompanies > 0 ? Math.round((fullyQualified / totalCompanies) * 100) : 0;

  const byIndustryMap: Record<string, number> = {};
  const byCityMap: Record<string, number> = {};
  const byVerificationMap: Record<string, number> = {};

  for (const l of rows) {
    const industry = l.category || "Diğer";
    byIndustryMap[industry] = (byIndustryMap[industry] ?? 0) + 1;

    const city = l.search_city || "Bilinmiyor";
    byCityMap[city] = (byCityMap[city] ?? 0) + 1;

    const status = l.email_verification_status || "unknown";
    byVerificationMap[status] = (byVerificationMap[status] ?? 0) + 1;
  }

  const { data: exportRows } = await supabase
    .from("export_log")
    .select("count")
    .eq("user_id", user.id);
  const exportCount = (exportRows ?? []).reduce(
    (sum, r) => sum + (r.count ?? 0),
    0
  );

  const { data: searchHistory } = await supabase
    .from("search_history")
    .select("id, keyword, city, result_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    totalCompanies,
    verifiedEmails,
    contactQualityScore,
    exportCount,
    leads: rows,
    searchHistory: searchHistory ?? [],
    byIndustry: Object.entries(byIndustryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    byCity: Object.entries(byCityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    byVerification: Object.entries(byVerificationMap).map(([name, value]) => ({
      name,
      value,
    })),
  });
}
