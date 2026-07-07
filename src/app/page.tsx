"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SearchHistoryItem {
  id: string;
  keyword: string;
  city: string;
  result_count: number;
  created_at: string;
}

interface DashboardLead {
  id: string;
  name: string;
  category: string | null;
  search_city: string | null;
  email: string | null;
  email_verification_status: string | null;
  lead_status: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
}

interface DashboardData {
  totalCompanies: number;
  verifiedEmails: number;
  contactQualityScore: number;
  exportCount: number;
  leads: DashboardLead[];
  searchHistory: SearchHistoryItem[];
  byIndustry: { name: string; value: number }[];
  byCity: { name: string; value: number }[];
  byVerification: { name: string; value: number }[];
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  contacted: "İletişime Geçildi",
  interested: "İlgileniyor",
  meeting: "Toplantı",
  negotiation: "Görüşme",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

const LEAD_STATUS_STYLES: Record<string, string> = {
  new: "bg-indigo-50 text-indigo-600",
  contacted: "bg-amber-50 text-amber-600",
  interested: "bg-sky-50 text-sky-600",
  meeting: "bg-violet-50 text-violet-600",
  negotiation: "bg-orange-50 text-orange-600",
  won: "bg-emerald-50 text-emerald-600",
  lost: "bg-red-50 text-red-600",
};

const VERIFICATION_COLORS: Record<string, string> = {
  valid: "#34d399",
  risky: "#fbbf24",
  catchall: "#818cf8",
  invalid: "#f87171",
  unknown: "#71717a",
};

const VERIFICATION_LABELS: Record<string, string> = {
  valid: "Geçerli",
  risky: "Riskli",
  catchall: "Catch-all",
  invalid: "Geçersiz",
  unknown: "Bilinmiyor",
};

const VERIFICATION_BADGE_STYLES: Record<string, string> = {
  valid: "bg-emerald-50 text-emerald-600",
  risky: "bg-amber-50 text-amber-600",
  catchall: "bg-indigo-50 text-indigo-600",
  invalid: "bg-red-50 text-red-600",
  unknown: "bg-zinc-100 text-zinc-500",
};

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#18181b",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Bilinmeyen bir hata oluştu.");
          return;
        }
        setData(json);
      } catch {
        setError("Dashboard verileri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-zinc-500">Yükleniyor...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error ?? "Veri bulunamadı."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-500">
          Aramalarınızın ve CRM&apos;inizin genel görünümü.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Firma" value={data.totalCompanies} />
        <StatCard label="Doğrulanmış E-posta" value={data.verifiedEmails} />
        <StatCard
          label="Kontak Kalite Skoru"
          value={`%${data.contactQualityScore}`}
        />
        <StatCard label="Export Sayısı" value={data.exportCount} />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-700">
            Sektöre Göre Firmalar
          </p>
          {data.byIndustry.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byIndustry}>
                <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-700">
            Şehre Göre Firmalar
          </p>
          {data.byCity.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byCity}>
                <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-700">
            E-posta Doğrulama Oranı
          </p>
          {data.byVerification.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.byVerification}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.byVerification.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={VERIFICATION_COLORS[entry.name] ?? "#71717a"}
                    />
                  ))}
                </Pie>
                <Legend
                  formatter={(value: string) => VERIFICATION_LABELS[value] ?? value}
                  wrapperStyle={{ fontSize: 12, color: "#71717a" }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-700">Son Aramalar</p>
          {data.searchHistory.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz arama yapılmadı.</p>
          ) : (
            <ul className="space-y-2">
              {data.searchHistory.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-zinc-100 pb-2 text-sm last:border-0"
                >
                  <span className="text-zinc-700">
                    {s.keyword} · {s.city}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {s.result_count} sonuç ·{" "}
                    {new Date(s.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
          <p className="text-sm font-medium text-zinc-700">
            Tüm Lead&apos;ler ({data.leads.length})
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim, e-posta, şehir veya sektöre göre filtrele..."
            className="w-full max-w-xs rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
          />
        </div>

        <div className="glass-card animate-fade-in-up overflow-hidden rounded-2xl">
          {data.leads.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Henüz kayıtlı lead yok. Arama sayfasından bir arama yapın.
            </p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Firma Adı</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Şehir</th>
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Doğrulama</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Telefon</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads
                    .filter((l) => {
                      if (!query.trim()) return true;
                      const q = query.toLowerCase();
                      return (
                        l.name?.toLowerCase().includes(q) ||
                        l.email?.toLowerCase().includes(q) ||
                        l.search_city?.toLowerCase().includes(q) ||
                        l.category?.toLowerCase().includes(q)
                      );
                    })
                    .map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {lead.category || "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {lead.search_city || "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {lead.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              VERIFICATION_BADGE_STYLES[
                                lead.email_verification_status ?? "unknown"
                              ]
                            }`}
                          >
                            {VERIFICATION_LABELS[
                              lead.email_verification_status ?? "unknown"
                            ] ?? "Bilinmiyor"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              LEAD_STATUS_STYLES[lead.lead_status ?? "new"]
                            }`}
                          >
                            {LEAD_STATUS_LABELS[lead.lead_status ?? "new"]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {lead.phone || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              Siteyi Aç
                            </a>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
