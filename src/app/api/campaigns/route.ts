import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

// Lead'lerin "yanıt verdi" sayılması için kullanılan durumlar. Gerçek bir
// e-posta gelen kutusu entegrasyonumuz olmadığından, kullanıcının CRM'de
// lead durumunu 'new'/'contacted' ötesine taşımasını bir yanıt sinyali
// olarak kabul ediyoruz (bkz. Dashboard huni ile aynı mantık).
const RESPONDED_STATUSES = ["interested", "meeting", "negotiation", "won"];

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
    return NextResponse.json({ error: "Supabase yapılandırılmamış." }, { status: 500 });
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from("email_campaigns")
    .select("id, name, target, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (campaignsError) {
    return NextResponse.json({ error: campaignsError.message }, { status: 500 });
  }

  const { data: logs } = await supabase
    .from("email_log")
    .select("campaign_id, lead_id, status, opened_at")
    .eq("user_id", user.id)
    .not("campaign_id", "is", null);

  const leadIds = Array.from(
    new Set((logs ?? []).map((l) => l.lead_id).filter((id): id is string => Boolean(id)))
  );

  const statusByLead = new Map<string, string>();
  if (leadIds.length > 0) {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("id, lead_status")
      .in("id", leadIds);
    for (const l of leadRows ?? []) {
      statusByLead.set(l.id, l.lead_status ?? "new");
    }
  }

  const result = (campaigns ?? []).map((c) => {
    const rows = (logs ?? []).filter((l) => l.campaign_id === c.id);
    const sent = rows.filter((l) => l.status === "sent").length;
    const opened = rows.filter((l) => l.opened_at).length;
    const respondedLeadIds = new Set(
      rows
        .filter((l) => l.lead_id && RESPONDED_STATUSES.includes(statusByLead.get(l.lead_id) ?? ""))
        .map((l) => l.lead_id)
    );
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    const replyRate = sent > 0 ? Math.round((respondedLeadIds.size / sent) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      target: c.target,
      status: c.status,
      created_at: c.created_at,
      sent,
      opened,
      replied: respondedLeadIds.size,
      openRate,
      replyRate,
    };
  });

  return NextResponse.json({ campaigns: result });
}

export async function POST(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, target } = body as { name?: string; target?: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Kampanya adı gerekli." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yapılandırılmamış." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ user_id: user.id, name: name.trim(), target: target ?? null, status: "active" })
    .select("id, name, target, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}
