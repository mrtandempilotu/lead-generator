import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/user-settings";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { to, subject, body: emailBody, leadId, campaignId } = body as {
    to?: string;
    subject?: string;
    body?: string;
    leadId?: string;
    campaignId?: string;
  };

  if (!to || !isValidEmail(to)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }
  if (!emailBody || !emailBody.trim()) {
    return NextResponse.json({ error: "Email content cannot be empty." }, { status: 400 });
  }

  const settings = await getUserSettings(user.id);
  const host = settings?.smtp_host;
  const port = settings?.smtp_port;
  const smtpUser = settings?.smtp_user;
  const smtpPassword = settings?.smtp_password;

  if (!host || !port || !smtpUser || !smtpPassword) {
    return NextResponse.json(
      {
        error:
          "SMTP details are missing. Fill in the SMTP host, port, username, and password fields on the Settings page.",
      },
      { status: 400 }
    );
  }

  const subjectLine = (subject || "").trim() || "(no subject)";
  const supabase = getSupabaseServerClient();

  // Alıcı lead'in bu kullanıcıya ait olduğunu doğrula (leadId verildiyse).
  let verifiedLeadId: string | null = null;
  if (leadId && supabase) {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();
    verifiedLeadId = leadRow?.id ?? null;
  }

  // Kampanyanın bu kullanıcıya ait olduğunu doğrula (campaignId verildiyse).
  let verifiedCampaignId: string | null = null;
  if (campaignId && supabase) {
    const { data: campaignRow } = await supabase
      .from("email_campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    verifiedCampaignId = campaignRow?.id ?? null;
  }

  // Her gönderim için tekil bir izleme token'ı üret; e-postaya gömülen
  // 1x1 piksel açıldığında bu token üzerinden email_log güncellenir.
  const trackToken = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const pixelUrl = `${origin}/api/email/track/${trackToken}`;
  const htmlBody = `<div style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;color:#18181b;">${escapeHtml(
    emailBody
  )}</div><img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587/25 = STARTTLS
    auth: { user: smtpUser, pass: smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: smtpUser,
      to,
      subject: subjectLine,
      text: emailBody,
      html: htmlBody,
    });
  } catch (err) {
    const message = (err as Error).message || "Unknown SMTP error.";
    // Başarısız gönderimi de logla (best-effort).
    if (supabase) {
      try {
        await supabase.from("email_log").insert({
          user_id: user.id,
          lead_id: verifiedLeadId,
          to_email: to,
          subject: subjectLine,
          body: emailBody,
          status: "failed",
          error: message.slice(0, 500),
        });
      } catch {
        // logging is best-effort
      }
    }
    return NextResponse.json(
      { error: `Failed to send email: ${message}` },
      { status: 502 }
    );
  }

  // Başarılı gönderim: logla ve lead'i "iletişime geçildi" yap (best-effort).
  if (supabase) {
    try {
      await supabase.from("email_log").insert({
        user_id: user.id,
        lead_id: verifiedLeadId,
        campaign_id: verifiedCampaignId,
        to_email: to,
        subject: subjectLine,
        body: emailBody,
        status: "sent",
        track_token: trackToken,
      });
    } catch {
      // logging is best-effort
    }

    if (verifiedLeadId) {
      try {
        await supabase
          .from("leads")
          .update({ lead_status: "contacted" })
          .eq("id", verifiedLeadId)
          .eq("user_id", user.id)
          .eq("lead_status", "new");
      } catch {
        // best-effort status bump
      }
    }
  }

  return NextResponse.json({ ok: true });
}
