"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, Plus } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  target: string | null;
  status: "active" | "paused";
  created_at: string;
  sent: number;
  opened: number;
  replied: number;
  openRate: number;
  replyRate: number;
}

export default function EmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kampanyalar yüklenemedi.");
        return;
      }
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("Kampanyalar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(c: Campaign) {
    setBusyId(c.id);
    const nextStatus = c.status === "active" ? "paused" : "active";
    setCampaigns((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x))
    );
    try {
      await fetch(`/api/campaigns/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // best-effort
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">E-Mail Kampagnen</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Toplu AI e-posta gönderimlerinizin performansı.
        </p>
      </header>

      <Link
        href="/leads"
        className="mb-6 flex animate-fade-in-up items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
      >
        <Plus className="h-4 w-4" /> Leads&apos;ten yeni kampanya başlat
      </Link>

      {loading && <p className="text-sm text-zinc-500">Yükleniyor...</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="glass-card animate-fade-in-up rounded-2xl p-6 text-sm text-zinc-500">
          Henüz bir kampanya yok. Leads sayfasından firma seçip &quot;Toplu AI
          E-posta&quot; ile ilk kampanyanızı başlatın.
        </div>
      )}

      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c.id} className="glass-card animate-fade-in-up rounded-2xl p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{c.name}</p>
                {c.target && (
                  <p className="truncate text-xs text-zinc-500">Ziel: {c.target}</p>
                )}
                <p className="text-[11px] text-zinc-400">
                  {new Date(c.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    c.status === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {c.status === "active" ? "● Aktiv" : "⏸ Pausiert"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStatus(c)}
                  disabled={busyId === c.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                  aria-label={c.status === "active" ? "Duraklat" : "Devam ettir"}
                >
                  {c.status === "active" ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 py-2">
                <p className="text-sm font-semibold text-zinc-900">{c.sent}</p>
                <p className="text-[10px] text-zinc-500">Versendet</p>
              </div>
              <div className="rounded-lg bg-zinc-50 py-2">
                <p className="text-sm font-semibold text-sky-600">%{c.openRate}</p>
                <p className="text-[10px] text-zinc-500">Geöffnet</p>
              </div>
              <div className="rounded-lg bg-zinc-50 py-2">
                <p className="text-sm font-semibold text-emerald-600">%{c.replyRate}</p>
                <p className="text-[10px] text-zinc-500">Antwort</p>
              </div>
            </div>

            <p className="mb-1 text-[11px] text-zinc-500">Trichter</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.max(c.replyRate, c.sent > 0 ? 1.5 : 0)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">{c.replyRate}%</p>
          </div>
        ))}
      </div>
    </main>
  );
}
