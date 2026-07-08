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
import { Mail, TrendingUp, Users, Flame } from "lucide-react";

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

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;
}

interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  time: string;
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
  emailsSent: number;
  openRate: number;
  newLeadsCount: number;
  hotLeadsCount: number;
  hotLeadNames: string[];
  funnel: FunnelStage[];
  activity: ActivityItem[];
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Guten Nacht!";
  if (h < 12) return "Guten Morgen!";
  if (h < 18) return "Guten Tag!";
  return "Guten Abend!";
}

function StatTile({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-4">
      <span
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        {icon}
      </span>
      <p className="text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
      <main className="mx-auto max-w-md px-4 py-8 sm:max-w-2xl">
        <p className="text-sm text-zinc-500">Yükleniyor...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:max-w-2xl">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error ?? "Veri bulunamadı."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {greeting()} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {new Date().toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile
          label="E-Mails versendet"
          value={data.emailsSent}
          icon={<Mail className="h-4.5 w-4.5" />}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatTile
          label="Öffnungsrate"
          value={`%${data.openRate}`}
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatTile
          label="Neue Leads"
          value={data.newLeadsCount}
          icon={<Users className="h-4.5 w-4.5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatTile
          label="Heisse Leads"
          value={data.hotLeadsCount}
          icon={<Flame className="h-4.5 w-4.5" />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {data.hotLeadsCount > 0 && (
        <div className="mb-6 rounded-2xl border-l-4 border-red-500 bg-red-50/60 p-4 animate-fade-in-up">
          <p className="text-sm font-semibold text-red-700">
            🔥 {data.hotLeadsCount} heisse Lead{data.hotLeadsCount > 1 ? "s" : ""} warten!
          </p>
          <p className="mt-1 text-xs text-red-600">
            {data.hotLeadNames.join(", ")}
            {data.hotLeadsCount > data.hotLeadNames.length &&
              ` und ${data.hotLeadsCount - data.hotLeadNames.length} weitere sind abschlussbereit.`}
          </p>
        </div>
      )}

      <section className="mb-6 animate-fade-in-up">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Live-Aktivitäten</h2>
        <p className="mb-3 -mt-2 text-xs text-zinc-500">Letzte Aktionen Ihres Systems</p>
        <div className="glass-card divide-y divide-zinc-100 overflow-hidden rounded-2xl">
          {data.activity.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">
              Henüz aktivite yok. Bir arama yapın veya e-posta gönderin.
            </p>
          ) : (
            data.activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3.5">
                <span className="text-lg leading-none">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800">{a.text}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">{timeOf(a.time)} Uhr</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-6 animate-fade-in-up">
        <h2 className="text-lg font-bold text-zinc-900">Vertriebs-Trichter</h2>
        <p className="mb-3 text-xs text-zinc-500">Aktueller Monat</p>
        <div className="glass-card space-y-4 rounded-2xl p-5">
          {data.funnel.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-sm font-medium text-zinc-700">{f.label}</p>
                <p className="text-sm font-semibold text-zinc-900">
                  {f.count.toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.max(f.rate, f.count > 0 ? 1.5 : 0)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{f.rate}% Konversionsrate</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 animate-fade-in-up">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Detaylı Analiz</h2>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-500">Toplam Firma</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{data.totalCompanies}</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-500">Kontak Kalite Skoru</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              %{data.contactQualityScore}
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-4">
          <div className="glass-card rounded-2xl p-5">
            <p className="mb-4 text-sm font-medium text-zinc-700">Sektöre Göre Firmalar</p>
            {data.byIndustry.length === 0 ? (
              <p className="text-sm text-zinc-500">Henüz veri yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byIndustry}>
                  <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="mb-4 text-sm font-medium text-zinc-700">Şehre Göre Firmalar</p>
            {data.byCity.length === 0 ? (
              <p className="text-sm text-zinc-500">Henüz veri yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCity}>
                  <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="mb-4 text-sm font-medium text-zinc-700">E-posta Doğrulama Oranı</p>
            {data.byVerification.length === 0 ? (
              <p className="text-sm text-zinc-500">Henüz veri yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.byVerification}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.byVerification.map((entry) => (
                      <Cell key={entry.name} fill={VERIFICATION_COLORS[entry.name] ?? "#71717a"} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => VERIFICATION_LABELS[value] ?? value}
                    wrapperStyle={{ fontSize: 11, color: "#71717a" }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
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
                      {s.result_count} sonuç · {new Date(s.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-700">Tüm Lead&apos;ler ({data.leads.length})</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim, e-posta, şehir veya sektöre göre filtrele..."
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
        />
        <div className="glass-card overflow-hidden rounded-2xl">
          {data.leads.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Henüz kayıtlı lead yok. Arama sayfasından bir arama yapın.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Firma</th>
                    <th className="px-3 py-2 font-medium">Şehir</th>
                    <th className="px-3 py-2 font-medium">Doğrulama</th>
                    <th className="px-3 py-2 font-medium">Durum</th>
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
                      <tr key={lead.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-zinc-900">{lead.name}</td>
                        <td className="px-3 py-2 text-zinc-500">{lead.search_city || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              VERIFICATION_BADGE_STYLES[lead.email_verification_status ?? "unknown"]
                            }`}
                          >
                            {VERIFICATION_LABELS[lead.email_verification_status ?? "unknown"] ??
                              "Bilinmiyor"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              LEAD_STATUS_STYLES[lead.lead_status ?? "new"]
                            }`}
                          >
                            {LEAD_STATUS_LABELS[lead.lead_status ?? "new"]}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
