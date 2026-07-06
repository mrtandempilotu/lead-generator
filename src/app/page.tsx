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

interface DashboardData {
  totalCompanies: number;
  verifiedEmails: number;
  contactQualityScore: number;
  exportCount: number;
  searchHistory: SearchHistoryItem[];
  byIndustry: { name: string; value: number }[];
  byCity: { name: string; value: number }[];
  byVerification: { name: string; value: number }[];
}

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

const TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-5">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <p className="text-sm text-zinc-400">Yükleniyor...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? "Veri bulunamadı."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-400">
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
          <p className="mb-4 text-sm font-medium text-zinc-300">
            Sektöre Göre Firmalar
          </p>
          {data.byIndustry.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byIndustry}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-300">
            Şehre Göre Firmalar
          </p>
          {data.byCity.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byCity}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-300">
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
                  wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card animate-fade-in-up rounded-2xl p-5">
          <p className="mb-4 text-sm font-medium text-zinc-300">Son Aramalar</p>
          {data.searchHistory.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz arama yapılmadı.</p>
          ) : (
            <ul className="space-y-2">
              {data.searchHistory.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-white/5 pb-2 text-sm last:border-0"
                >
                  <span className="text-zinc-200">
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
    </main>
  );
}
