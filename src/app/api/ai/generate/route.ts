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
      ? "Write the response entirely in German."
      : language === "en"
      ? "Write the response entirely in English."
      : "Write the response entirely in Turkish.";

  const context = `Company: ${companyName}, Industry: ${industry}, City: ${city}. We are a supplier of workwear / uniforms (protective clothing, PPE) in Germany and want to open a business conversation with this company.`;

  switch (type) {
    case "cold_email":
      return `${context}\n${langInstruction}\nWrite a short, personalized, professional cold sales email to this company (first contact). Use the company name and industry naturally. Around 120-180 words, sales-oriented but warm in tone, end with a clear call to action. Write only the email body, no subject line.`;
    case "follow_up":
      return `${context}\n${langInstruction}\nWe already sent this company a cold email but got no reply. Write a short, polite follow-up email (60-100 words) that re-engages interest without being pushy.`;
    case "subject_line":
      return `${context}\n${langInstruction}\nGenerate 5 different, short, attention-grabbing subject line options that could be used for a cold email to the company above. Return only a numbered list, no other explanation.`;
    case "linkedin_message":
      return `${context}\n${langInstruction}\nWrite a short LinkedIn connection request / first message (under 300 characters) to this company's decision maker. Keep it natural and warm, not salesy.`;
    default:
      return `${context}\n${langInstruction}\nWrite a short introductory message for this company.`;
  }
}

export async function POST(req: NextRequest) {
  const userClient = await getSupabaseServerUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in." }, { status: 401 });
  }

  const settings = await getUserSettings(user.id);
  const openRouterKey = settings?.openrouter_api_key || DEFAULT_OPENROUTER_API_KEY;

  if (!openRouterKey) {
    return NextResponse.json(
      {
        error:
          "No OpenRouter API key is set. Enter your own key on the Settings page or set the server environment variable (OPENROUTER_API_KEY).",
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
        { error: `OpenRouter error (${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
