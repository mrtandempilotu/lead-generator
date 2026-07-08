// Lead kalite skoru: bir lead'in ne kadar "değerli/ulaşılabilir" olduğunu
// 0-100 arası tek bir sayıyla özetler. Tamamen türetilmiş bir değerdir
// (veritabanında saklanmaz), böylece ekstra migration gerekmez ve mevcut
// tüm lead'ler için anında hesaplanır.

export interface ScorableLead {
  email?: string | null;
  email_verification_status?: string | null;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  ratings_total?: number | null;
  closed?: boolean | null;
}

export function computeLeadScore(lead: ScorableLead): number {
  let score = 0;

  // E-posta doğrulama durumu (en önemli sinyal — max 40)
  switch (lead.email_verification_status) {
    case "valid":
      score += 40;
      break;
    case "catchall":
      score += 25;
      break;
    case "risky":
      score += 15;
      break;
    case "unknown":
      score += 5;
      break;
    default:
      break;
  }

  // En azından bir e-posta bulunmuş olması (max 10)
  if (lead.email) score += 10;

  // Web sitesi var (max 15)
  if (lead.website) score += 15;

  // Telefon var (max 10)
  if (lead.phone) score += 10;

  // Puan kalitesi (max 15)
  if (typeof lead.rating === "number") {
    if (lead.rating >= 4.5) score += 15;
    else if (lead.rating >= 4.0) score += 10;
    else if (lead.rating >= 3.0) score += 5;
  }

  // Popülerlik / yorum sayısı (max 10)
  if (typeof lead.ratings_total === "number") {
    if (lead.ratings_total >= 100) score += 10;
    else if (lead.ratings_total >= 20) score += 6;
    else if (lead.ratings_total >= 5) score += 3;
  }

  // Kapalı işletme cezası
  if (lead.closed) score -= 25;

  return Math.max(0, Math.min(100, score));
}

// 4 kademeli skor sistemi (mockup: Heiss/Warm/Kühl/Kalt). "hot" eski API'yle
// uyumluluk için ayrı bir isim yerine "heiss" kullanıyoruz; TIER_META ve
// scoreTier tüketen tüm yerler bu 4 anahtarı bekler.
export type ScoreTier = "heiss" | "warm" | "kuehl" | "kalt";

export function scoreTier(score: number): ScoreTier {
  if (score >= 85) return "heiss";
  if (score >= 60) return "warm";
  if (score >= 40) return "kuehl";
  return "kalt";
}

export const TIER_META: Record<
  ScoreTier,
  { label: string; icon: string; badge: string; dot: string; ring: string }
> = {
  heiss: {
    label: "Heiss",
    icon: "🔥",
    badge: "bg-red-50 text-red-600",
    dot: "bg-red-500",
    ring: "#ef4444",
  },
  warm: {
    label: "Warm",
    icon: "☀️",
    badge: "bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
    ring: "#f59e0b",
  },
  kuehl: {
    label: "Kühl",
    icon: "❄️",
    badge: "bg-sky-50 text-sky-600",
    dot: "bg-sky-500",
    ring: "#38bdf8",
  },
  kalt: {
    label: "Kalt",
    icon: "📦",
    badge: "bg-violet-50 text-violet-600",
    dot: "bg-violet-500",
    ring: "#a78bfa",
  },
};
