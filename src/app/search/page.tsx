"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface SavedSearch {
  id: string;
  keyword: string;
  city: string;
  filters: { websiteOnly?: boolean; phoneOnly?: boolean; verifiedOnly?: boolean } | null;
  created_at: string;
}

interface Lead {
  placeId: string;
  name: string;
  address: string;
  category: string;
  rating: number | null;
  ratingsTotal: number | null;
  phone: string;
  website: string;
  email: string;
  emailVerificationStatus?: string;
  closed: boolean;
}

const SECTOR_SUGGESTIONS = [
  "Otel",
  "Restoran",
  "İnşaat firması",
  "Fabrika",
  "Temizlik şirketi",
  "Nakliye ve lojistik firması",
  "Oto servisi",
  "Gıda üretim tesisi",
  "Hastane / klinik",
  "Depo ve lojistik merkezi",
];

const CITY_SUGGESTIONS = [
  "Berlin",
  "München",
  "Hamburg",
  "Köln",
  "Frankfurt",
  "Stuttgart",
  "Düsseldorf",
  "Dortmund",
  "Essen",
  "Leipzig",
];

const VERIFICATION_LABELS: Record<string, string> = {
  valid: "Geçerli",
  risky: "Riskli",
  catchall: "Catch-all",
  invalid: "Geçersiz",
  unknown: "Bilinmiyor",
};

const VERIFICATION_STYLES: Record<string, string> = {
  valid: "bg-emerald-500/10 text-emerald-400",
  risky: "bg-amber-500/10 text-amber-400",
  catchall: "bg-indigo-500/10 text-indigo-400",
  invalid: "bg-red-500/10 text-red-400",
  unknown: "bg-zinc-500/10 text-zinc-400",
};

function exportRows(leads: Lead[]) {
  return leads.map((l) => ({
    "Firma Adı": l.name,
    Kategori: l.category,
    Adres: l.address,
    Telefon: l.phone,
    "E-posta": l.email,
    "E-posta Durumu": VERIFICATION_LABELS[l.emailVerificationStatus ?? "unknown"],
    Website: l.website,
    Puan: l.rating ?? "",
    "Değerlendirme Sayısı": l.ratingsTotal ?? "",
    Durum: l.closed ? "Kapalı" : "Açık",
  }));
}

async function logExport(format: string, count: number) {
  try {
    await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, count }),
    });
  } catch {
    // best-effort, ignore failures
  }
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [websiteOnly, setWebsiteOnly] = useState(false);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  async function loadSavedSearches() {
    try {
      const res = await fetch("/api/saved-searches");
      const data = await res.json();
      if (res.ok) setSavedSearches(data.savedSearches ?? []);
    } catch {
      // best-effort
    }
  }

  async function saveCurrentSearch() {
    if (!keyword.trim() || !city.trim()) return;
    setSavingSearch(true);
    try {
      await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          city,
          filters: { websiteOnly, phoneOnly, verifiedOnly },
        }),
      });
      await loadSavedSearches();
    } catch {
      // best-effort
    } finally {
      setSavingSearch(false);
    }
  }

  function applySavedSearch(s: SavedSearch) {
    setKeyword(s.keyword);
    setCity(s.city);
    setWebsiteOnly(Boolean(s.filters?.websiteOnly));
    setPhoneOnly(Boolean(s.filters?.phoneOnly));
    setVerifiedOnly(Boolean(s.filters?.verifiedOnly));
  }

  async function deleteSavedSearch(id: string) {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          city,
          maxResults,
          filters: { websiteOnly, phoneOnly, verifiedOnly },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Bilinmeyen bir hata oluştu.");
        setLoading(false);
        return;
      }

      setLeads(data.results);
      setHasSearched(true);
    } catch {
      setError("İstek gönderilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      setError("Lütfen sektör/anahtar kelime ve şehir girin.");
      return;
    }
    runSearch();
  }

  function fileBaseName() {
    return `leads_${keyword.replace(/\s+/g, "-")}_${city.replace(/\s+/g, "-")}`;
  }

  function exportCsv() {
    if (leads.length === 0) return;
    const rows = exportRows(leads);
    const headers = Object.keys(rows[0]);
    const csvContent = [headers, ...rows.map((r) => Object.values(r))]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["﻿" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBaseName()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logExport("csv", leads.length);
  }

  function exportExcel() {
    if (leads.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(exportRows(leads));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `${fileBaseName()}.xlsx`);
    logExport("xlsx", leads.length);
  }

  function exportJson() {
    if (leads.length === 0) return;
    const blob = new Blob([JSON.stringify(leads, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBaseName()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logExport("json", leads.length);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Firma Ara
        </h1>
        <p className="mt-2 text-zinc-400">
          İş kıyafeti / uniforma satın alma potansiyeli olan firmaları (otel,
          restoran, fabrika, inşaat vb.) Almanya genelinde arayın.
        </p>
      </header>

      {savedSearches.length > 0 && (
        <div className="mb-6 animate-fade-in-up">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Kayıtlı Aramalar
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
              >
                <button
                  type="button"
                  onClick={() => applySavedSearch(s)}
                  className="hover:text-white"
                >
                  {s.keyword} · {s.city}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedSearch(s.id)}
                  className="text-zinc-500 hover:text-red-400"
                  aria-label="Sil"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-card mb-8 animate-fade-in-up rounded-2xl p-6"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">
              Sektör / Anahtar Kelime
            </label>
            <input
              list="sector-suggestions"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="örn. otel, inşaat firması, fabrika"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
            />
            <datalist id="sector-suggestions">
              {SECTOR_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">
              Şehir (Almanya)
            </label>
            <input
              list="city-suggestions"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="örn. Berlin, München"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
            />
            <datalist id="city-suggestions">
              {CITY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">
              Maksimum Sonuç
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={websiteOnly}
              onChange={(e) => setWebsiteOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 accent-indigo-500"
            />
            Sadece website olanlar
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={phoneOnly}
              onChange={(e) => setPhoneOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 accent-indigo-500"
            />
            Sadece telefon olanlar
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 accent-indigo-500"
            />
            Sadece doğrulanmış e-posta
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Aranıyor... (biraz sürebilir)" : "Firma Ara"}
          </button>
          <button
            type="button"
            onClick={saveCurrentSearch}
            disabled={savingSearch || !keyword.trim() || !city.trim()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            {savingSearch ? "Kaydediliyor..." : "Aramayı Kaydet"}
          </button>
          {leads.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                CSV ({leads.length})
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                JSON
              </button>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </form>

      {hasSearched && (
        <div className="glass-card animate-fade-in-up overflow-hidden rounded-2xl">
          {leads.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">
              Sonuç bulunamadı. Farklı bir sektör, şehir veya filtre deneyin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Firma Adı</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Adres</th>
                    <th className="px-4 py-3 font-medium">Telefon</th>
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.placeId}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        {lead.name}
                        {lead.closed && (
                          <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">
                            Kapalı
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {lead.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {lead.address}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {lead.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {lead.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            VERIFICATION_STYLES[
                              lead.emailVerificationStatus ?? "unknown"
                            ]
                          }`}
                        >
                          {
                            VERIFICATION_LABELS[
                              lead.emailVerificationStatus ?? "unknown"
                            ]
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline"
                          >
                            Siteyi Aç
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {lead.rating
                          ? `${lead.rating} ★ (${lead.ratingsTotal ?? 0})`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
