import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/user-settings";

const DEFAULT_OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// OpenRouter gives access to many models through one API/key — this can be
// swapped via env var without touching code. Defaults to a cheap, solid model.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

const VALID_TYPES = ["cold_email", "follow_up", "subject_line", "linkedin_message"];
const VALID_LANGS = ["tr", "en", "de"];

interface LeadContext {
  name?: string;
  category?: string | null;
  city?: string | null;
}

function buildPrompt(type: string, language: string, lead: LeadContext): string {
  const companyName = lead.name || "the company";
  const industry = lead.category || "their industry";
  const city = lead.city || "Germany";

  const langInstruction =
    language === "de"
      ? "Yanıtı tamamen Almanca yaz."
      : language === "en"
      ? "Write the response entirely in English."
      : "Yanıtı tamamen Türkçe yaz.";

  const context = `Firma: ${companyName}, Sektör: ${industry}, Şehir: ${city}. Biz Almanya'da iş kıyafeti / uniforma (işçi kıyafeti, PPE) tedarikçisiyiz ve bu firmayla iş görüşmesi başlatmak istiyoruz.`;

  switch (type) {
    case "cold_email":
      return `${context}\n${langInstruction}\nBu firmaya gönderilecek kısa, kişiselleştirilmiş, profesyonel bir soğuk satış e-postası yaz (ilk temas). Firma adını ve sektörünü doğal şekilde kullan. 120-180 kelime civarı, satış dilinde ama samimi ol, net bir eylem çağrısıyla bitir. Sadece e-posta gövdesini yaz, konu satırı ekleme.`;
    case "follow_up":
      return `${context}\n${langInstruction}\nDaha önce bu firmaya bir soğuk e-posta gönderdik ama yanıt alamadık. Kısa, nazik bir takip e-postası yaz (60-100 kelime), baskıcı olmadan tekrar ilgi çekmeye çalış.`;
    case "subject_line":
      return `${context}\n${langInstruction}\nYukarıdaki firma için soğuk e-posta konu satırı olarak kullanılabilecek 5 farklı, kısa ve dikkat çekici seçenek üret. Sadece numaralı liste olarak ver, başka açıklama ekleme.`;
    case "linkedin_message":
      return `${context}\n${langInstruction}\nBu firmanın karar vericisine LinkedIn üzerinden gönderilecek kısa bir bağlantı isteği / ilk mesaj yaz (300 karakteri geçmesin), doğal ve samimi olsun, satış gibi hissettirmesin.`;
    default:
      return `${context}\n${langInstruction}\nBu firma için kısa bir tanıtım mesajı yaz.`;
  }
}

export async function POST(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const settings = await getUserSettings(user.id);
  const openRouterKey = settings?.openrouter_api_key || DEFAULT_OPENROUTER_API_KEY;

  if (!openRouterKey) {
    return NextResponse.json(
      {
        error:
          "OpenRouter API anahtarı tanımlı değil. Ayarlar sayfasından kendi anahtarınızı girin ya da sunucu ortam değişkenini (OPENROUTER_API_KEY) ayarlayın.",
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { type, language, lead } = body as {
    type?: string;
    language?: string;
    lead?: LeadContext;
  };

  if (!type || !language || !VALID_TYPES.includes(type) || !VALID_LANGS.includes(language)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const prompt = buildPrompt(type, language, lead ?? {});

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenRouter hatası (${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: `Beklenmeyen hata: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
