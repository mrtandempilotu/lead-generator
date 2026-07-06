import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getSupabaseServerUserClient } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/user-settings";

// Shared server defaults. A signed-in user can override any of these from the
// Settings page (stored per-user in `user_settings`) so a real multi-tenant
// deployment doesn't have every account burning through one shared quota.
const DEFAULT_APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const DEFAULT_HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const ACTOR_ID = "compass~crawler-google-places";

interface ApifyPlace {
  placeId?: string;
  title?: string;
  address?: string | null;
  categoryName?: string | null;
  totalScore?: number | null;
  reviewsCount?: number | null;
  phone?: string | null;
  website?: string | null;
  emails?: string[];
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  url?: string;
  location?: { lat?: number; lng?: number } | null;
}

interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
}

function extractDomain(website: string): string | null {
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// German law (§5 TMG) requires every commercial website to publish an "Impressum"
// (legal notice) page, which almost always lists a contact email. This is a free,
// no-API-key fallback that works specifically well for German businesses.
const IMPRESSUM_PATHS = [
  "/impressum",
  "/impressum.html",
  "/impressum/",
  "/de/impressum",
  "/kontakt",
  "/kontakt.html",
  "/contact",
];

function isUsableEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    !lower.endsWith(".png") &&
    !lower.endsWith(".jpg") &&
    !lower.endsWith(".jpeg") &&
    !lower.endsWith(".gif") &&
    !lower.endsWith(".svg") &&
    !lower.includes("sentry") &&
    !lower.includes("example.com") &&
    !lower.includes("wixpress") &&
    !lower.includes("schema.org")
  );
}

async function findEmailFromImpressum(website: string): Promise<string> {
  let origin: string;
  try {
    origin = new URL(website.startsWith("http") ? website : `https://${website}`).origin;
  } catch {
    return "";
  }

  const candidateUrls = [origin, ...IMPRESSUM_PATHS.map((p) => origin + p)];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadGeneratorBot/1.0)" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = html.match(EMAIL_REGEX);
      if (matches) {
        const found = matches.map((m) => m.toLowerCase()).find(isUsableEmail);
        if (found) return found;
      }
    } catch {
      // Try the next candidate URL.
    }
  }
  return "";
}

async function findEmailForDomain(
  domain: string,
  hunterKey: string
): Promise<{ email: string; confidence: number | null }> {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
      domain
    )}&limit=3&api_key=${hunterKey}`;
    const res = await fetch(url);
    if (!res.ok) return { email: "", confidence: null };
    const json = await res.json();
    const emails: HunterEmail[] = json?.data?.emails ?? [];
    if (emails.length === 0) return { email: "", confidence: null };
    const generic = emails.find((e) => e.type === "generic");
    const best = generic ?? emails.sort((a, b) => b.confidence - a.confidence)[0];
    return { email: best.value, confidence: best.confidence };
  } catch {
    return { email: "", confidence: null };
  }
}

// Hunter's Email Verifier gives a "status" (valid/invalid/accept_all/webmail/
// disposable/unknown) and a "result" (deliverable/risky/undeliverable). We map
// that down to the 5 statuses the UI shows: valid, risky, catchall, invalid, unknown.
// Shares the same monthly Hunter credit pool as Domain Search — best-effort, and
// silently falls back to "unknown" if the quota is exhausted or the call fails.
async function verifyEmail(email: string, hunterKey: string): Promise<string> {
  if (!hunterKey) return "unknown";
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
      email
    )}&api_key=${hunterKey}`;
    const res = await fetch(url);
    if (!res.ok) return "unknown";
    const json = await res.json();
    const data = json?.data;
    if (!data) return "unknown";
    if (data.status === "accept_all") return "catchall";
    if (data.status === "unknown") return "unknown";
    if (data.result === "deliverable") return "valid";
    if (data.result === "risky") return "risky";
    if (data.result === "undeliverable") return "invalid";
    return "unknown";
  } catch {
    return "unknown";
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

  // A user's own API keys (set on the Settings page) take priority over the
  // shared server defaults from env vars.
  const settings = await getUserSettings(user.id);
  const apifyToken = settings?.apify_api_token || DEFAULT_APIFY_API_TOKEN;
  const hunterKey = settings?.hunter_api_key || DEFAULT_HUNTER_API_KEY;

  if (!apifyToken) {
    return NextResponse.json(
      {
        error:
          "Apify API anahtarı tanımlı değil. Ayarlar sayfasından kendi anahtarınızı girin ya da sunucu ortam değişkenini (APIFY_API_TOKEN) ayarlayın.",
      },
      { status: 500 }
    );
  }

  let body: {
    keyword?: string;
    city?: string;
    maxResults?: number;
    filters?: {
      websiteOnly?: boolean;
      phoneOnly?: boolean;
      verifiedOnly?: boolean;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { keyword, city, maxResults, filters = {} } = body;

  if (!keyword || !city) {
    return NextResponse.json(
      { error: "keyword ve city alanları zorunludur." },
      { status: 400 }
    );
  }

  const input = {
    searchStringsArray: [keyword],
    locationQuery: `${city}, Germany`,
    maxCrawledPlacesPerSearch: Math.min(Math.max(maxResults ?? 20, 1), 100),
    language: "de",
    // Try Apify's own contact enrichment first (scrapes the business website for
    // an email). Hunter.io is then used as a fallback for anything Apify misses.
    scrapeContacts: true,
    scrapeSocialMediaProfiles: {
      facebooks: false,
      instagrams: false,
      youtubes: false,
      tiktoks: false,
      twitters: false,
    },
    maximumLeadsEnrichmentRecords: 0,
  };

  try {
    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apifyToken}`;
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Apify API hatası (${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const items: ApifyPlace[] = await res.json();

    const baseResults = items.map((place, idx) => ({
      placeId: place.placeId ?? place.url ?? `row-${idx}`,
      name: place.title ?? "",
      address: place.address ?? "",
      category: place.categoryName ?? "",
      rating: place.totalScore ?? null,
      ratingsTotal: place.reviewsCount ?? null,
      phone: place.phone ?? "",
      website: place.website ?? "",
      email: place.emails && place.emails.length > 0 ? place.emails[0] : "",
      emailConfidence: null as number | null,
      emailVerificationStatus: "unknown" as string,
      closed: Boolean(place.permanentlyClosed || place.temporarilyClosed),
      lat: place.location?.lat ?? null,
      lng: place.location?.lng ?? null,
    }));

    // Fill in the gaps with Hunter.io, only for results Apify didn't already find an email for.
    if (hunterKey) {
      const domainCache = new Map<string, { email: string; confidence: number | null }>();

      await Promise.all(
        baseResults.map(async (result) => {
          if (result.email || !result.website) return;
          const domain = extractDomain(result.website);
          if (!domain) return;

          if (!domainCache.has(domain)) {
            domainCache.set(domain, await findEmailForDomain(domain, hunterKey));
          }
          const found = domainCache.get(domain)!;
          result.email = found.email;
          result.emailConfidence = found.confidence;
        })
      );
    }

    // Last resort: scrape the business's own Impressum/Kontakt page directly.
    // Free, no API key needed, and works well since German sites are legally
    // required to publish a contact email there.
    {
      const impressumCache = new Map<string, string>();

      await Promise.all(
        baseResults.map(async (result) => {
          if (result.email || !result.website) return;
          const domain = extractDomain(result.website);
          if (!domain) return;

          if (!impressumCache.has(domain)) {
            impressumCache.set(domain, await findEmailFromImpressum(result.website));
          }
          const found = impressumCache.get(domain)!;
          if (found) {
            result.email = found;
            result.emailConfidence = null;
          }
        })
      );
    }

    // Only keep leads where an email was actually found.
    let results = baseResults.filter((r) => r.email);

    // Verify each unique email found (best-effort, shares Hunter's monthly quota).
    if (hunterKey) {
      const verifyCache = new Map<string, string>();
      await Promise.all(
        results.map(async (result) => {
          if (!verifyCache.has(result.email)) {
            verifyCache.set(result.email, await verifyEmail(result.email, hunterKey));
          }
          result.emailVerificationStatus = verifyCache.get(result.email)!;
        })
      );
    }

    // Apply the user's filters (post-fetch, since Google Maps has no equivalent query params).
    if (filters.websiteOnly) results = results.filter((r) => r.website);
    if (filters.phoneOnly) results = results.filter((r) => r.phone);
    if (filters.verifiedOnly) {
      results = results.filter((r) => r.emailVerificationStatus === "valid");
    }

    const supabase = getSupabaseServerClient();

    // Save every found lead into the CRM (Supabase). Best-effort: if Supabase
    // isn't configured or the insert fails, the search still returns normally.
    if (supabase && results.length > 0) {
      try {
        const rows = results.map((r) => ({
          user_id: user.id,
          place_id: r.placeId,
          name: r.name,
          address: r.address || null,
          category: r.category || null,
          phone: r.phone || null,
          email: r.email || null,
          website: r.website || null,
          rating: r.rating,
          ratings_total: r.ratingsTotal,
          closed: r.closed,
          search_keyword: keyword,
          search_city: city,
          email_verification_status: r.emailVerificationStatus,
          lat: r.lat,
          lng: r.lng,
        }));
        await supabase.from("leads").upsert(rows, { onConflict: "user_id,place_id" });
      } catch (err) {
        console.error("Supabase kaydı başarısız oldu:", err);
      }
    }

    // Log this search into the dashboard's search history (best-effort).
    if (supabase) {
      try {
        await supabase.from("search_history").insert({
          user_id: user.id,
          keyword,
          city,
          result_count: results.length,
        });
      } catch (err) {
        console.error("Arama geçmişi kaydı başarısız oldu:", err);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: `Beklenmeyen hata: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
