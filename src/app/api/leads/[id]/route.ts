import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";

const VALID_STATUSES = [
  "new",
  "contacted",
  "interested",
  "meeting",
  "negotiation",
  "won",
  "lost",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.lead_status === "string") {
    if (!VALID_STATUSES.includes(body.lead_status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.lead_status = body.lead_status;
  }
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (Array.isArray(body.tags)) updates.tags = body.tags;
  if (body.reminder_at === null || typeof body.reminder_at === "string") {
    updates.reminder_at = body.reminder_at;
  }
  if (typeof body.is_favorite === "boolean") updates.is_favorite = body.is_favorite;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
