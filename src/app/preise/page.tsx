import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "0",
    period: "free",
    description: "For those who want to try it out.",
    features: ["50 search results per month", "Use with your own API keys", "CRM & lead scoring"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49",
    period: "month",
    description: "For active sales teams.",
    features: [
      "Unlimited search results",
      "Bulk AI emails + open tracking",
      "Priority email support",
      "Campaign analytics",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    price: "149",
    period: "month",
    description: "For multiple users and integrations.",
    features: [
      "Everything in Pro",
      "WhatsApp integration (coming soon)",
      "Multi-user access",
      "Custom integration support",
    ],
    highlighted: false,
  },
];

export default function PreisePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pricing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Choose the plan that fits your needs. Payment isn&apos;t collected
          from this screen yet — informational only.
        </p>
      </header>

      <div className="space-y-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`glass-card animate-fade-in-up rounded-2xl p-5 ${
              plan.highlighted ? "ring-2 ring-indigo-400" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-zinc-900">{plan.name}</p>
              {plan.highlighted && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                  Popular
                </span>
              )}
            </div>
            <p className="mb-1 text-2xl font-bold text-zinc-900">
              {plan.price === "0" ? "Free" : `€${plan.price}`}
              {plan.price !== "0" && (
                <span className="text-sm font-normal text-zinc-400"> / {plan.period}</span>
              )}
            </p>
            <p className="mb-4 text-xs text-zinc-500">{plan.description}</p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
