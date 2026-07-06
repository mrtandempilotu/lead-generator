import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

const VALID_FORMATS = ["csv", "xlsx", "json"];

export async function POST(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const format = body.format;
  const count = Number(body.count) || 0;

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Geçersiz format." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("export_log").insert({
        user_id: user.id,
        format,
        count,
      });
    } catch (err) {
      console.error("Export log kaydı başarısız oldu:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
