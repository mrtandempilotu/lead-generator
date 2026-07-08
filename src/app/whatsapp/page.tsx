import { MessageCircle } from "lucide-react";

export default function WhatsAppPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:max-w-2xl">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
        <MessageCircle className="h-8 w-8" />
      </span>
      <h1 className="text-xl font-bold text-zinc-900">WhatsApp Integration</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Soon you&apos;ll be able to chat with your leads directly over WhatsApp
        and manage AI-powered automatic replies right here.
      </p>
      <span className="mt-5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
        Coming soon
      </span>
    </main>
  );
}
