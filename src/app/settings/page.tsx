"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SettingsRow {
  apify_api_token: string | null;
  hunter_api_key: string | null;
  openrouter_api_key: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  language: string | null;
}

const EMPTY: SettingsRow = {
  apify_api_token: "",
  hunter_api_key: "",
  openrouter_api_key: "",
  smtp_host: "",
  smtp_port: null,
  smtp_user: "",
  smtp_password: "",
  language: "tr",
};

const LANGUAGES = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
      />
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<SettingsRow>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ayarlar yüklenemedi.");
        return;
      }
      if (data.settings) {
        setForm({
          apify_api_token: data.settings.apify_api_token ?? "",
          hunter_api_key: data.settings.hunter_api_key ?? "",
          openrouter_api_key: data.settings.openrouter_api_key ?? "",
          smtp_host: data.settings.smtp_host ?? "",
          smtp_port: data.settings.smtp_port ?? null,
          smtp_user: data.settings.smtp_user ?? "",
          smtp_password: data.settings.smtp_password ?? "",
          language: data.settings.language ?? "tr",
        });
      }
    } catch {
      setError("Ayarlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof SettingsRow>(key: K, value: SettingsRow[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kaydedilemedi.");
        return;
      }
      setMessage("Ayarlar kaydedildi.");
    } catch {
      setError("Kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Ayarlar</h1>
        <p className="mt-2 text-zinc-500">
          Kendi API anahtarlarınızı girerek arama ve AI asistan özelliklerini
          kendi kotanızla kullanabilirsiniz. Boş bırakılan alanlar için
          uygulamanın paylaşılan varsayılan anahtarları kullanılır.
        </p>
      </header>

      {loading && <p className="text-sm text-zinc-500">Yükleniyor...</p>}

      {!loading && (
        <div className="space-y-6 animate-fade-in-up">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600">
              {message}
            </p>
          )}

          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">API Anahtarları</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Apify (Google Maps arama), Hunter.io (e-posta bulma/doğrulama) ve
              OpenRouter (AI mesaj üretimi).
            </p>
            <div className="space-y-3">
              <Field
                label="Apify API Token"
                value={form.apify_api_token ?? ""}
                onChange={(v) => set("apify_api_token", v)}
                placeholder="apify_api_..."
              />
              <Field
                label="Hunter.io API Key"
                value={form.hunter_api_key ?? ""}
                onChange={(v) => set("hunter_api_key", v)}
                placeholder="hunter api key"
              />
              <Field
                label="OpenRouter API Key"
                value={form.openrouter_api_key ?? ""}
                onChange={(v) => set("openrouter_api_key", v)}
                placeholder="sk-or-v1-..."
              />
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">SMTP (e-posta gönderimi)</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Şu an sadece kaydediliyor; otomatik e-posta gönderimi henüz bu
              bilgileri kullanmıyor (yakında).
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="SMTP Host"
                value={form.smtp_host ?? ""}
                onChange={(v) => set("smtp_host", v)}
                placeholder="smtp.example.com"
              />
              <Field
                label="SMTP Port"
                value={form.smtp_port?.toString() ?? ""}
                onChange={(v) => set("smtp_port", v === "" ? null : Number(v))}
                placeholder="587"
              />
              <Field
                label="SMTP Kullanıcı Adı"
                value={form.smtp_user ?? ""}
                onChange={(v) => set("smtp_user", v)}
              />
              <Field
                label="SMTP Şifre"
                type="password"
                value={form.smtp_password ?? ""}
                onChange={(v) => set("smtp_password", v)}
              />
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">Dil</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Tercihiniz kaydedilir; arayüzün tamamının çevirisi henüz
              uygulanmadı (yakında).
            </p>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("language", l.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    form.language === l.value
                      ? "bg-indigo-500 text-white"
                      : "border border-zinc-200 text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>

          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">Hesap</h2>
            <p className="mb-4 text-xs text-zinc-500">Oturumu sonlandırın.</p>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Çıkış Yap
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
