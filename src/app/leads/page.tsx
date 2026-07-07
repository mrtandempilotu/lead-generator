"use client";

import { useEffect, useState } from "react";
import AIAssistantPanel from "@/components/AIAssistantPanel";

interface LeadRow {
  id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  ratings_total: number | null;
  closed: boolean;
  search_keyword: string | null;
  search_city: string | null;
  email_verification_status: string | null;
  lead_status: string | null;
  notes: string | null;
  tags: string[] | null;
  reminder_at: string | null;
  is_favorite: boolean | null;
  created_at: string;
}

const STATUS_COLUMNS: { key: string; label: string; dot: string; badge: string }[] = [
  { key: "new", label: "Yeni", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-600" },
  { key: "contacted", label: "İletişime Geçildi", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-600" },
  { key: "interested", label: "İlgileniyor", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-600" },
  { key: "meeting", label: "Toplantı", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-600" },
  { key: "negotiation", label: "Görüşme", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-600" },
  { key: "won", label: "Kazanıldı", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  { key: "lost", label: "Kaybedildi", dot: "bg-red-500", badge: "bg-red-50 text-red-600" },
];

const VERIFICATION_LABELS: Record<string, string> = {
  valid: "Geçerli",
  risky: "Riskli",
  catchall: "Catch-all",
  invalid: "Geçersiz",
  unknown: "Bilinmiyor",
};

const VERIFICATION_STYLES: Record<string, string> = {
  valid: "bg-emerald-50 text-emerald-600",
  risky: "bg-amber-50 text-amber-600",
  catchall: "bg-indigo-50 text-indigo-600",
  invalid: "bg-red-50 text-red-600",
  unknown: "bg-zinc-100 text-zinc-500",
};

function LeadCard({
  lead,
  onUpdate,
}: {
  lead: LeadRow;
  onUpdate: (id: string, updates: Partial<LeadRow>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [tagsInput, setTagsInput] = useState((lead.tags ?? []).join(", "));
  const [reminder, setReminder] = useState(
    lead.reminder_at ? lead.reminder_at.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  async function save() {
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await onUpdate(lead.id, {
      notes,
      tags,
      reminder_at: reminder ? new Date(reminder).toISOString() : null,
    });
    setSaving(false);
  }

  return (
    <div className="glass-card rounded-xl p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 font-medium text-zinc-900">
          <button
            type="button"
            onClick={() => onUpdate(lead.id, { is_favorite: !lead.is_favorite })}
            className={lead.is_favorite ? "text-amber-500" : "text-zinc-300 hover:text-amber-500"}
            aria-label="Favori"
          >
            ★
          </button>
          {lead.name}
        </p>
        <select
          value={lead.lead_status ?? "new"}
          onChange={(e) => onUpdate(lead.id, { lead_status: e.target.value })}
          className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-xs text-zinc-600 outline-none"
        >
          {STATUS_COLUMNS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        {lead.category || "—"} · {lead.search_city || "—"}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-500">{lead.email}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {lead.phone || "—"}
        {lead.website && (
          <>
            {" · "}
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Site
            </a>
          </>
        )}
      </p>
      <span
        className={`mt-2 inline-block rounded px-1.5 py-0.5 text-xs ${
          VERIFICATION_STYLES[lead.email_verification_status ?? "unknown"]
        }`}
      >
        {VERIFICATION_LABELS[lead.email_verification_status ?? "unknown"]}
      </span>

      {(lead.tags ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(lead.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {lead.reminder_at && (
        <p className="mt-1 text-[11px] text-amber-600">
          Hatırlatıcı: {new Date(lead.reminder_at).toLocaleDateString("tr-TR")}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {expanded ? "Kapat" : "Not / Etiket / Hatırlatıcı"}
        </button>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="text-xs text-indigo-600 hover:underline"
        >
          AI Mesaj
        </button>
      </div>

      {aiOpen && (
        <AIAssistantPanel
          lead={{ name: lead.name, category: lead.category, city: lead.search_city }}
          onClose={() => setAiOpen(false)}
        />
      )}

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Not ekle..."
            rows={2}
            className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-indigo-400 focus:bg-white"
          />
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="etiket1, etiket2"
            className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-indigo-400 focus:bg-white"
          />
          <input
            type="date"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-indigo-400 focus:bg-white"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bilinmeyen bir hata oluştu.");
        return;
      }
      setLeads(data.leads);
    } catch {
      setError("Kayıtlı lead'ler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function updateLead(id: string, updates: Partial<LeadRow>) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      // best-effort; a manual refresh will resync if this failed
    }
  }

  const filtered = leads.filter((l) => {
    if (favoritesOnly && !l.is_favorite) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.search_city?.toLowerCase().includes(q) ||
      l.search_keyword?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">CRM</h1>
        <p className="mt-2 text-zinc-500">
          Bulunan lead&apos;leri durumlarına göre yönetin; not, etiket ve
          hatırlatıcı ekleyin.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-in-up">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim, e-posta, şehir veya sektöre göre filtrele..."
          className="w-full max-w-md rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 bg-white accent-amber-500"
          />
          Sadece favoriler ★
        </label>
      </div>

      {loading && <p className="text-sm text-zinc-500">Yükleniyor...</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        (leads.length === 0 ? (
          <div className="glass-card animate-fade-in-up rounded-2xl p-6 text-sm text-zinc-500">
            Henüz kayıtlı lead yok. Arama sayfasından bir arama yapın;
            e-postası bulunan firmalar otomatik olarak burada listelenecek.
          </div>
        ) : (
          <div className="grid animate-fade-in-up gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {STATUS_COLUMNS.map((col) => {
              const colLeads = filtered.filter(
                (l) => (l.lead_status ?? "new") === col.key
              );
              return (
                <div
                  key={col.key}
                  className="flex flex-col rounded-2xl border border-zinc-200/70 bg-white/50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <p className="text-sm font-semibold text-zinc-700">
                        {col.label}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${col.badge}`}
                    >
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} />
                    ))}
                    {colLeads.length === 0 && (
                      <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
                        Boş
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </main>
  );
}
