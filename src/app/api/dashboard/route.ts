import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { computeLeadScore, scoreTier } from "@/lib/lead-score";

const RESPONDED_STATUSES = ["interested", "meeting", "negotiation", "won"];
const DEAL_READY_STATUSES = ["negotiation", "won"];

const STATUS_LABELS: Record<string, string> = {
  contacted: "İletişime Geçildi",
  interested: "İlgileniyor",
  meeting: "Toplantı",
  negotiation: "Görüşme",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

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
      "id, name, category, search_city, email, email_verification_status, lead_status, phone, website, rating, ratings_total, closed, created_at, updated_at"
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

  const scored = rows.map((l) => ({ ...l, score: computeLeadScore(l), tier: scoreTier(computeLeadScore(l)) }));

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
  const exportCount = (exportRows ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0);

  const { data: searchHistory } = await supabase
    .from("search_history")
    .select("id, keyword, city, result_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: emailRows } = await supabase
    .from("email_log")
    .select("id, to_email, status, opened_at, created_at, campaign_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: campaignRows } = await supabase
    .from("email_campaigns")
    .select("id, name")
    .eq("user_id", user.id);
  const campaignNameById = new Map((campaignRows ?? []).map((c) => [c.id, c.name]));

  const sentEmails = (emailRows ?? []).filter((e) => e.status === "sent");
  const emailsSent = sentEmails.length;
  const emailsOpened = sentEmails.filter((e) => e.opened_at).length;
  const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const newLeadsCount = rows.filter((l) => new Date(l.created_at).getTime() >= dayAgo).length;

  const hotLeads = scored.filter((l) => l.tier === "heiss").sort((a, b) => b.score - a.score);
  const hotLeadsCount = hotLeads.length;
  const hotLeadNames = hotLeads.slice(0, 3).map((l) => l.name);

  const respondedCount = rows.filter((l) =>
    RESPONDED_STATUSES.includes(l.lead_status ?? "")
  ).length;
  const dealReadyCount = rows.filter((l) =>
    DEAL_READY_STATUSES.includes(l.lead_status ?? "")
  ).length;

  function rate(count: number) {
    return totalCompanies > 0 ? Math.round((count / totalCompanies) * 1000) / 10 : 0;
  }

  const funnel = [
    { key: "found", label: "Kontakte gefunden", count: totalCompanies, rate: 100 },
    { key: "opened", label: "E-Mail geöffnet", count: emailsOpened, rate: rate(emailsOpened) },
    { key: "responded", label: "Geantwortet", count: respondedCount, rate: rate(respondedCount) },
    { key: "whatsapp", label: "WhatsApp-Gespräch", count: 0, rate: 0 },
    { key: "dealReady", label: "Abschluss-bereit", count: dealReadyCount, rate: rate(dealReadyCount) },
  ];

  // --- Live-Aktivitäten: gerçek olaylardan birleştirilmiş akış ---
  const activity: ActivityItem[] = [];

  for (const s of (searchHistory ?? []).slice(0, 5)) {
    activity.push({
      id: `search-${s.id}`,
      icon: "🔍",
      text: `${s.keyword} · ${s.city} araması — ${s.result_count} firma bulundu`,
      time: s.created_at,
    });
  }

  // Gönderilen e-postaları kampanya + gün bazında grupla (mockup'taki
  // "147 personalisierte E-Mails versendet" tarzı tekil satır için).
  const emailGroups = new Map<string, { count: number; time: string; campaignId: string | null }>();
  for (const e of sentEmails) {
    const day = e.created_at.slice(0, 10);
    const key = `${e.campaign_id ?? "none"}-${day}`;
    const existing = emailGroups.get(key);
    if (existing) {
      existing.count += 1;
      if (e.created_at > existing.time) existing.time = e.created_at;
    } else {
      emailGroups.set(key, { count: 1, time: e.created_at, campaignId: e.campaign_id });
    }
  }
  for (const [key, g] of emailGroups) {
    const campaignName = g.campaignId ? campaignNameById.get(g.campaignId) : null;
    activity.push({
      id: `email-${key}`,
      icon: "📧",
      text: `${g.count} personalisierte E-Mail${g.count > 1 ? "s" : ""} versendet${
        campaignName ? ` — Kampagne: ${campaignName}` : ""
      }`,
      time: g.time,
    });
  }

  for (const l of hotLeads.slice(0, 5)) {
    activity.push({
      id: `hot-${l.id}`,
      icon: "🔥",
      text: `${l.name} — Score ${l.score} ile 'Heiss' lead olarak işaretlendi`,
      time: l.created_at,
    });
  }

  for (const l of rows) {
    if (RESPONDED_STATUSES.includes(l.lead_status ?? "") && l.updated_at) {
      activity.push({
        id: `status-${l.id}`,
        icon: "💬",
        text: `${l.name} — durum '${STATUS_LABELS[l.lead_status ?? ""] ?? l.lead_status}' olarak güncellendi`,
        time: l.updated_at,
      });
    }
  }

  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

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
    byVerification: Object.entries(byVerificationMap).map(([name, value]) => ({ name, value })),
    emailsSent,
    openRate,
    newLeadsCount,
    hotLeadsCount,
    hotLeadNames,
    funnel,
    activity: activity.slice(0, 8),
  });
}
