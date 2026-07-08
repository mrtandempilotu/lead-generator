"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Globe as GlobeIcon } from "lucide-react";
import AIAssistantPanel from "@/components/AIAssistantPanel";
import BulkEmailModal, { BulkLead } from "@/components/BulkEmailModal";
import ScoreRing from "@/components/ScoreRing";
import { computeLeadScore, scoreTier, TIER_META } from "@/lib/lead-score";

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
  selected,
  onToggleSelect,
}: {
  lead: LeadRow;
  onUpdate: (id: string, updates: Partial<LeadRow>) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [tagsInput, setTagsInput] = useState((lead.tags ?? []).join(", "));
  const [reminder, setReminder] = useState(
    lead.reminder_at ? lead.reminder_at.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const score = computeLeadScore(lead);
  const tier = TIER_META[scoreTier(score)];

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
    <div
      className={`glass-card rounded-xl p-3 text-sm ${
        selected ? "ring-2 ring-indigo-400" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ScoreRing score={score} color={tier.ring} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 truncate font-medium text-zinc-900">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(lead.id)}
                className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 accent-indigo-500"
                aria-label="Seç"
              />
              <button
                type="button"
                onClick={() => onUpdate(lead.id, { is_favorite: !lead.is_favorite })}
                className={`shrink-0 ${
                  lead.is_favorite ? "text-amber-500" : "text-zinc-300 hover:text-amber-500"
                }`}
                aria-label="Favori"
              >
                ★
              </button>
              <span className="truncate">{lead.name}</span>
            </p>
            <select
              value={lead.lead_status ?? "new"}
              onChange={(e) => onUpdate(lead.id, { lead_status: e.target.value })}
              className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-xs text-zinc-600 outline-none"
            >
              {STATUS_COLUMNS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {lead.category || "—"} · {lead.search_city || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${tier.badge}`}
              title={`Lead skoru: ${score}/100`}
            >
              <span>{tier.icon}</span>
              {tier.label}
            </span>
            {lead.email && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600"
                title={lead.email}
              >
                <Mail className="h-3 w-3" /> Mail
              </span>
            )}
            {lead.website && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                <GlobeIcon className="h-3 w-3" /> Web
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 truncate text-xs text-zinc-500">{lead.email}</p>
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
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-xs ${
            VERIFICATION_STYLES[lead.email_verification_status ?? "unknown"]
          }`}
        >
          {VERIFICATION_LABELS[lead.email_verification_status ?? "unknown"]}
        </span>
      </div>

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
          lead={{
            id: lead.id,
            name: lead.name,
            category: lead.category,
            city: lead.search_city,
            email: lead.email,
          }}
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

function RemindersPanel({
  leads,
  onClear,
}: {
  leads: LeadRow[];
  onClear: (id: string) => void;
}) {
  const now = new Date();
  const endToday = endOfDay(now);
  const in7Days = endToday + 7 * 24 * 60 * 60 * 1000;

  const withReminder = leads
    .filter((l) => l.reminder_at)
    .map((l) => ({ lead: l, date: new Date(l.reminder_at as string) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Bugüne kadar (dahil) vadesi gelenler, ve önümüzdeki 7 gün içinde yaklaşanlar.
  const overdueOrToday = withReminder.filter((r) => r.date.getTime() <= endToday);
  const upcoming = withReminder.filter(
    (r) => r.date.getTime() > endToday && r.date.getTime() < in7Days
  );

  if (overdueOrToday.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 animate-fade-in-up">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
        🔔 Hatırlatıcılar
      </p>
      <div className="space-y-1.5">
        {overdueOrToday.map(({ lead, date }) => (
          <ReminderRow
            key={lead.id}
            lead={lead}
            date={date}
            overdue={date.getTime() <= now.getTime()}
            onClear={onClear}
          />
        ))}
        {upcoming.map(({ lead, date }) => (
          <ReminderRow
            key={lead.id}
            lead={lead}
            date={date}
            overdue={false}
            onClear={onClear}
          />
        ))}
      </div>
    </div>
  );
}

function endOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
}

function ReminderRow({
  lead,
  date,
  overdue,
  onClear,
}: {
  lead: LeadRow;
  date: Date;
  overdue: boolean;
  onClear: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate text-zinc-700">
        <span
          className={`mr-2 rounded px-1.5 py-0.5 font-medium ${
            overdue ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
          }`}
        >
          {date.toLocaleDateString("tr-TR")}
        </span>
        <span className="font-medium text-zinc-900">{lead.name}</span>
        {lead.email && <span className="text-zinc-400"> · {lead.email}</span>}
      </span>
      <button
        type="button"
        onClick={() => onClear(lead.id)}
        className="shrink-0 rounded border border-amber-300 px-2 py-0.5 text-amber-700 transition hover:bg-amber-100"
      >
        Temizle
      </button>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
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
      }),
    [leads, favoritesOnly, query]
  );

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((l) => l.id)));
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkUpdate(updates: Partial<LeadRow>) {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => updateLead(id, updates)));
  }

  async function bulkAddTag() {
    const tag = bulkTag.trim();
    if (!tag) return;
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) => {
        const lead = leads.find((l) => l.id === id);
        const existing = lead?.tags ?? [];
        if (existing.includes(tag)) return Promise.resolve();
        return updateLead(id, { tags: [...existing, tag] });
      })
    );
    setBulkTag("");
  }

  const bulkLeads: BulkLead[] = selectedLeads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    category: l.category,
    city: l.search_city,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">CRM</h1>
        <p className="mt-2 text-zinc-500">
          Bulunan lead&apos;leri durumlarına göre yönetin; skorlayın, not,
          etiket ve hatırlatıcı ekleyin, toplu e-posta gönderin.
        </p>
      </header>

      {!loading && !error && (
        <RemindersPanel
          leads={leads}
          onClear={(id) => updateLead(id, { reminder_at: null })}
        />
      )}

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
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={selectAllFiltered}
            className="text-sm text-indigo-600 hover:underline"
          >
            Tümünü seç ({filtered.length})
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-30 mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-200 bg-white/90 p-3 shadow-sm backdrop-blur animate-fade-in-up">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} seçili
          </span>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <select
            onChange={(e) => {
              if (e.target.value) bulkUpdate({ lead_status: e.target.value });
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 outline-none"
          >
            <option value="" disabled>
              Durum değiştir...
            </option>
            {STATUS_COLUMNS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              placeholder="etiket ekle"
              className="w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={bulkAddTag}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100"
            >
              Ekle
            </button>
          </div>
          <button
            type="button"
            onClick={() => bulkUpdate({ is_favorite: true })}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100"
          >
            ★ Favori
          </button>
          <button
            type="button"
            onClick={() => setBulkEmailOpen(true)}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-400"
          >
            Toplu AI E-posta
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-800"
          >
            Seçimi temizle
          </button>
        </div>
      )}

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
              const colLeads = filtered
                .filter((l) => (l.lead_status ?? "new") === col.key)
                .sort((a, b) => computeLeadScore(b) - computeLeadScore(a));
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
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onUpdate={updateLead}
                        selected={selectedIds.has(lead.id)}
                        onToggleSelect={toggleSelect}
                      />
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

      {bulkEmailOpen && (
        <BulkEmailModal
          leads={bulkLeads}
          onClose={() => setBulkEmailOpen(false)}
          onSent={() => {
            load();
          }}
        />
      )}
    </main>
  );
}
