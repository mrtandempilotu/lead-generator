"use client";

import { useState } from "react";

interface LeadContext {
  id?: string;
  name?: string;
  category?: string | null;
  city?: string | null;
  email?: string | null;
}

const TYPES: { key: string; label: string }[] = [
  { key: "cold_email", label: "Cold Email" },
  { key: "follow_up", label: "Follow-up Email" },
  { key: "subject_line", label: "Subject Line" },
  { key: "linkedin_message", label: "LinkedIn Message" },
];

const LANGUAGES: { key: string; label: string }[] = [
  { key: "en", label: "English" },
  { key: "de", label: "Deutsch" },
  { key: "tr", label: "Türkçe" },
];

// The output generated for these types is an email body that can be sent directly.
const SENDABLE_TYPES = new Set(["cold_email", "follow_up"]);

export default function AIAssistantPanel({
  lead,
  onClose,
}: {
  lead: LeadContext;
  onClose: () => void;
}) {
  const [type, setType] = useState("cold_email");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const canSend = SENDABLE_TYPES.has(type) && !!lead.email && !!result.trim();

  async function generate() {
    setLoading(true);
    setError(null);
    setResult("");
    setCopied(false);
    setSendMsg(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, language, lead }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unknown error occurred.");
        return;
      }
      setResult(data.text);
      if (SENDABLE_TYPES.has(type) && !subject) {
        setSubject(`Collaboration opportunity with ${lead.name ?? "your company"}`);
      }
    } catch {
      setError("An error occurred while sending the request.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function sendEmail() {
    setSending(true);
    setSendMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email,
          subject,
          body: result,
          leadId: lead.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send email.");
        return;
      }
      setSendMsg(`Email sent to ${lead.email}.`);
    } catch {
      setError("An error occurred while sending the email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 px-4">
      <div className="glass-card w-full max-w-lg rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">AI Assistant</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-500">
          Create a message for {lead.name ?? "this company"}.
          {lead.email && (
            <span className="text-zinc-400"> · {lead.email}</span>
          )}
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
          {loading ? "Generating..." : "Generate"}
        </button>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {sendMsg && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
            {sendMsg}
          </p>
        )}

        {result && (
          <div className="space-y-2">
            {SENDABLE_TYPES.has(type) && (
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 focus:bg-white"
              />
            )}
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 focus:bg-white"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-zinc-200 px-4 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-100"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              {SENDABLE_TYPES.has(type) && (
                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={!canSend || sending}
                  title={
                    lead.email
                      ? "Send to this company via SMTP"
                      : "This company has no email address"
                  }
                  className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Email"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
