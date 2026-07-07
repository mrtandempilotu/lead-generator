"use client";

import { useState } from "react";

interface LeadContext {
  name?: string;
  category?: string | null;
  city?: string | null;
}

const TYPES: { key: string; label: string }[] = [
  { key: "cold_email", label: "Soğuk E-posta" },
  { key: "follow_up", label: "Takip E-postası" },
  { key: "subject_line", label: "Konu Satırı" },
  { key: "linkedin_message", label: "LinkedIn Mesajı" },
];

const LANGUAGES: { key: string; label: string }[] = [
  { key: "tr", label: "Türkçe" },
  { key: "en", label: "English" },
  { key: "de", label: "Deutsch" },
];

export default function AIAssistantPanel({
  lead,
  onClose,
}: {
  lead: LeadContext;
  onClose: () => void;
}) {
  const [type, setType] = useState("cold_email");
  const [language, setLanguage] = useState("tr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult("");
    setCopied(false);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, language, lead }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bilinmeyen bir hata oluştu.");
        return;
      }
      setResult(data.text);
    } catch {
      setError("İstek gönderilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 px-4">
      <div className="glass-card w-full max-w-lg rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">AI Asistan</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-500">
          {lead.name ?? "Bu firma"} için mesaj oluştur.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                type === t.key
                  ? "bg-indigo-500 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLanguage(l.key)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                language === l.key
                  ? "bg-indigo-500 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="mb-4 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {loading ? "Oluşturuluyor..." : "Oluştur"}
        </button>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {result && (
          <div>
            <textarea
              readOnly
              value={result}
              rows={8}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="mt-2 rounded-lg border border-zinc-200 px-4 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
