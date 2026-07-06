import { getSupabaseServerClient } from "@/lib/supabase";

export interface UserSettings {
  user_id: string;
  apify_api_token: string | null;
  hunter_api_key: string | null;
  openrouter_api_key: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  language: string | null;
}

// Every user can optionally bring their own API keys (Apify, Hunter, OpenRouter)
// so a real multi-tenant SaaS doesn't share one account's quota across everyone.
// If a user hasn't set their own key, callers fall back to the server's env vars.
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as UserSettings) ?? null;
  } catch {
    return null;
  }
}
