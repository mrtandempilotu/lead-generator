"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setMessage(
      "Hesap oluşturuldu. Doğrulama e-postası gerekmiyorsa doğrudan giriş yapabilirsiniz."
    );
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15),_transparent_60%)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl animate-fade-in-up">
        <h1 className="mb-1 text-2xl font-semibold text-white">
          BerlinLead <span className="text-indigo-400">AI</span>
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          {mode === "login" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Şifre
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Bekleyin..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setMessage(null);
          }}
          className="mt-4 w-full text-center text-xs text-zinc-400 transition hover:text-zinc-200"
        >
          {mode === "login"
            ? "Hesabın yok mu? Kayıt ol"
            : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </div>
    </div>
  );
}
