import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

const ALLOWED_LANGUAGES = ["tr", "en", "de"];

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

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ?? null });
}

export async function PATCH(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    apify_api_token,
    hunter_api_key,
    openrouter_api_key,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_password,
    language,
  } = body as Record<string, unknown>;

  if (language !== undefined && !ALLOWED_LANGUAGES.includes(language as string)) {
    return NextResponse.json({ error: "Geçersiz dil değeri." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { user_id: user.id };
  if (apify_api_token !== undefined) updates.apify_api_token = apify_api_token || null;
  if (hunter_api_key !== undefined) updates.hunter_api_key = hunter_api_key || null;
  if (openrouter_api_key !== undefined) updates.openrouter_api_key = openrouter_api_key || null;
  if (smtp_host !== undefined) updates.smtp_host = smtp_host || null;
  if (smtp_port !== undefined) {
    const port = Number(smtp_port);
    updates.smtp_port = smtp_port === "" || smtp_port === null || Number.isNaN(port) ? null : port;
  }
  if (smtp_user !== undefined) updates.smtp_user = smtp_user || null;
  if (smtp_password !== undefined) updates.smtp_password = smtp_password || null;
  if (language !== undefined) updates.language = language;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yapılandırılmamış." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(updates, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
