import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side, cookie-aware Supabase client. Uses the anon key + the current
// user's session cookies (NOT the service role key), so it respects RLS and
// only ever sees what the signed-in user is allowed to see. Use this to read
// `auth.getUser()` in Server Components and Route Handlers.
export async function getSupabaseServerUserClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore since
            // middleware.ts refreshes the session on every request.
          }
        },
      },
    }
  );
}
