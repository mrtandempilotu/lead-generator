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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="glass-card w-full max-w-lg rounded-2xl bg-zinc-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">AI Asistan</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
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
                  : "border border-white/10 text-zinc-300 hover:bg-white/10"
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
                  : "border border-white/10 text-zinc-300 hover:bg-white/10"
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

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {result && (
          <div>
            <textarea
              readOnly
              value={result}
              rows={8}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="mt-2 rounded-lg border border-white/10 px-4 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
