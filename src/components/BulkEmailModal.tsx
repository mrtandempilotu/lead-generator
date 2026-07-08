"use client";

import { useState } from "react";

export interface BulkLead {
  id: string;
  name: string;
  email: string | null;
  category: string | null;
  city: string | null;
}

const TYPES: { key: string; label: string }[] = [
  { key: "cold_email", label: "Cold Email" },
  { key: "follow_up", label: "Follow-up Email" },
];

const LANGUAGES: { key: string; label: string }[] = [
  { key: "en", label: "English" },
  { key: "de", label: "Deutsch" },
  { key: "tr", label: "Türkçe" },
];

type DraftStatus = "idle" | "generating" | "ready" | "sending" | "sent" | "error";

interface Draft {
  subject: string;
  body: string;
  status: DraftStatus;
  error?: string;
}

export default function BulkEmailModal({
  leads,
  onClose,
  onSent,
}: {
  leads: BulkLead[];
  onClose: () => void;
  onSent: () => void;
}) {
  // Only leads with an email address can receive a send.
  const eligible = leads.filter((l) => l.email);

  const [type, setType] = useState("cold_email");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [campaignName, setCampaignName] = useState(
    `Campaign · ${new Date().toLocaleDateString("en-US")}`
  );

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => {
      const base: Draft = prev[id] ?? { subject: "", body: "", status: "idle" };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  async function generateAll() {
    setBusy(true);
    for (const lead of eligible) {
      updateDraft(lead.id, { status: "generating" });
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            language,
            lead: { name: lead.name, category: lead.category, city: lead.city },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          updateDraft(lead.id, { status: "error", error: data.error ?? "Generation failed." });
          continue;
        }
        updateDraft(lead.id, {
          status: "ready",
          body: data.text ?? "",
          subject: `Collaboration opportunity with ${lead.name}`,
        });
      } catch {
        updateDraft(lead.id, { status: "error", error: "Request error." });
      }
    }
    setBusy(false);
  }

  async function sendAll() {
    setBusy(true);

    // Group this send batch into a campaign so it can be listed with
    // sent/opened/replied stats on the Email page.
    let campaignId: string | undefined;
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim() || "Untitled Campaign",
          target: eligible.map((l) => l.city).filter(Boolean).join(", ") || null,
        }),
      });
      const data = await res.json();
      if (res.ok) campaignId = data.campaign?.id;
    } catch {
      // if campaign creation fails, still proceed with sending
    }

    let sentCount = 0;
    for (const lead of eligible) {
      const draft = drafts[lead.id];
      if (!draft || draft.status !== "ready" || !draft.body.trim()) continue;
      updateDraft(lead.id, { status: "sending" });
      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.email,
            subject: draft.subject,
            body: draft.body,
            leadId: lead.id,
            campaignId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          updateDraft(lead.id, { status: "error", error: data.error ?? "Send failed." });
          continue;
        }
        updateDraft(lead.id, { status: "sent" });
        sentCount++;
      } catch {
        updateDraft(lead.id, { status: "error", error: "Send error." });
      }
    }
    setBusy(false);
    if (sentCount > 0) onSent();
  }

  const readyCount = eligible.filter((l) => drafts[l.id]?.status === "ready").length;
  const skipped = leads.length - eligible.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 px-4 py-8">
      <div className="glass-card flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Bulk AI Email ({eligible.length} companies)
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        {skipped > 0 && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {skipped} companies were excluded because they have no email address.
          </p>
        )}

        <div className="mb-3">
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
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
          <span className="mx-1 h-4 w-px bg-zinc-200" />
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

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateAll}
            disabled={busy || eligible.length === 0}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? "Working..." : "Generate All"}
          </button>
          <button
            type="button"
            onClick={sendAll}
            disabled={busy || readyCount === 0}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            Send All ({readyCount})
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {eligible.map((lead) => {
            const draft = drafts[lead.id];
            const status = draft?.status ?? "idle";
            return (
              <div
                key={lead.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {lead.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{lead.email}</p>
                  </div>
                  <StatusPill status={status} />
                </div>
                {draft?.error && (
                  <p className="mb-2 text-xs text-red-600">{draft.error}</p>
                )}
                {(status === "ready" || status === "sending" || status === "sent") && (
                  <div className="space-y-2">
                    <input
                      value={draft?.subject ?? ""}
                      onChange={(e) => updateDraft(lead.id, { subject: e.target.value })}
                      placeholder="Subject"
                      className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-indigo-400"
                    />
                    <textarea
                      value={draft?.body ?? ""}
                      onChange={(e) => updateDraft(lead.id, { body: e.target.value })}
                      rows={4}
                      className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DraftStatus }) {
  const map: Record<DraftStatus, { label: string; cls: string }> = {
    idle: { label: "Waiting", cls: "bg-zinc-100 text-zinc-500" },
    generating: { label: "Generating...", cls: "bg-indigo-50 text-indigo-600" },
    ready: { label: "Ready", cls: "bg-sky-50 text-sky-600" },
    sending: { label: "Sending...", cls: "bg-amber-50 text-amber-600" },
    sent: { label: "Sent ✓", cls: "bg-emerald-50 text-emerald-600" },
    error: { label: "Error", cls: "bg-red-50 text-red-600" },
  };
  const m = map[status];
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
