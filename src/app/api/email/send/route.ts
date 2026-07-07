import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/user-settings";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  const { to, subject, body: emailBody, leadId } = body as {
    to?: string;
    subject?: string;
    body?: string;
    leadId?: string;
  };

  if (!to || !isValidEmail(to)) {
    return NextResponse.json({ error: "Geçerli bir alıcı e-postası gerekli." }, { status: 400 });
  }
  if (!emailBody || !emailBody.trim()) {
    return NextResponse.json({ error: "E-posta içeriği boş olamaz." }, { status: 400 });
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
          "SMTP bilgileri eksik. Ayarlar sayfasından SMTP sunucu, port, kullanıcı ve şifre alanlarını doldurun.",
      },
      { status: 400 }
    );
  }

  const subjectLine = (subject || "").trim() || "(konu yok)";
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
    });
  } catch (err) {
    const message = (err as Error).message || "Bilinmeyen SMTP hatası.";
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
      { error: `E-posta gönderilemedi: ${message}` },
      { status: 502 }
    );
  }

  // Başarılı gönderim: logla ve lead'i "iletişime geçildi" yap (best-effort).
  if (supabase) {
    try {
      await supabase.from("email_log").insert({
        user_id: user.id,
        lead_id: verifiedLeadId,
        to_email: to,
        subject: subjectLine,
        body: emailBody,
        status: "sent",
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
