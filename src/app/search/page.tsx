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
  "Hotel",
  "Restaurant",
  "Construction company",
  "Factory",
  "Cleaning company",
  "Transport & logistics company",
  "Auto repair shop",
  "Food production facility",
  "Hospital / clinic",
  "Warehouse & logistics center",
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
  valid: "Valid",
  risky: "Risky",
  catchall: "Catch-all",
  invalid: "Invalid",
  unknown: "Unknown",
};

const VERIFICATION_STYLES: Record<string, string> = {
  valid: "bg-emerald-50 text-emerald-600",
  risky: "bg-amber-50 text-amber-600",
  catchall: "bg-indigo-50 text-indigo-600",
  invalid: "bg-red-50 text-red-600",
  unknown: "bg-zinc-100 text-zinc-500",
};

function exportRows(leads: Lead[]) {
  return leads.map((l) => ({
    "Company Name": l.name,
    Category: l.category,
    Address: l.address,
    Phone: l.phone,
    Email: l.email,
    "Email Status": VERIFICATION_LABELS[l.emailVerificationStatus ?? "unknown"],
    Website: l.website,
    Rating: l.rating ?? "",
    "Review Count": l.ratingsTotal ?? "",
    Status: l.closed ? "Closed" : "Open",
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
  // Higher default than before: since only a fraction of raw results end up
  // having a discoverable email (especially in sectors like healthcare where
  // businesses rarely publish one), a larger initial pull yields more usable leads.
  const [maxResults, setMaxResults] = useState(40);
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
        setError(data.error ?? "An unknown error occurred.");
        setLoading(false);
        return;
      }

      setLeads(data.results);
      setHasSearched(true);
    } catch {
      setError("An error occurred while sending the request.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      setError("Please enter an industry/keyword and a city.");
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
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Search Companies
        </h1>
        <p className="mt-2 text-zinc-500">
          Search for companies across Germany with potential to buy work
          clothing / uniforms (hotels, restaurants, factories, construction, etc.).
        </p>
      </header>

      {savedSearches.length > 0 && (
        <div className="mb-6 animate-fade-in-up">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Saved Searches
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600"
              >
                <button
                  type="button"
                  onClick={() => applySavedSearch(s)}
                  className="hover:text-zinc-900"
                >
                  {s.keyword} · {s.city}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedSearch(s.id)}
                  className="text-zinc-500 hover:text-red-600"
                  aria-label="Delete"
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
            <label className="mb-1 block text-sm font-medium text-zinc-500">
              Industry / Keyword
            </label>
            <input
              list="sector-suggestions"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. hotel, construction company, factory"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            />
            <datalist id="sector-suggestions">
              {SECTOR_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-500">
              City (Germany)
            </label>
            <input
              list="city-suggestions"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Berlin, Munich"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            />
            <datalist id="city-suggestions">
              {CITY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-500">
              Max Results
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={websiteOnly}
              onChange={(e) => setWebsiteOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white accent-indigo-500"
            />
            Website only
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={phoneOnly}
              onChange={(e) => setPhoneOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white accent-indigo-500"
            />
            Phone only
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white accent-indigo-500"
            />
            Verified email only
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Searching... (may take a moment)" : "Search"}
          </button>
          <button
            type="button"
            onClick={saveCurrentSearch}
            disabled={savingSearch || !keyword.trim() || !city.trim()}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {savingSearch ? "Saving..." : "Save Search"}
          </button>
          {leads.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
              >
                CSV ({leads.length})
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
              >
                JSON
              </button>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {hasSearched && (
        <div className="glass-card animate-fade-in-up overflow-hidden rounded-2xl">
          {leads.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              No results found. Try a different industry, city, or filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.placeId}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {lead.name}
                        {lead.closed && (
                          <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                            Closed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {lead.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {lead.address}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {lead.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
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
                            className="text-indigo-600 hover:underline"
                          >
                            Visit Site
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
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
