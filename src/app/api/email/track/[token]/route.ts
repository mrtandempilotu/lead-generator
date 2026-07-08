import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

// 1x1 transparent GIF, served regardless of outcome (never break the email
// client's image render, even if the token is unknown or logging fails).
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = getSupabaseServerClient();
  if (supabase && token) {
    try {
      const { data: row } = await supabase
        .from("email_log")
        .select("id, opened_at, open_count")
        .eq("track_token", token)
        .maybeSingle();

      if (row) {
        await supabase
          .from("email_log")
          .update({
            opened_at: row.opened_at ?? new Date().toISOString(),
            open_count: (row.open_count ?? 0) + 1,
          })
          .eq("id", row.id);
      }
    } catch {
      // best-effort — never fail the pixel response
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
