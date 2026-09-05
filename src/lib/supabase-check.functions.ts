import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Verifies the user-provided APP_SUPABASE_* credentials and checks whether
// the project's own Supabase database has the expected schema applied.
export const checkOwnSupabase = createServerFn({ method: "GET" }).handler(
  async () => {
    const url = process.env["APP_SUPABASE_URL"];
    const publishableKey = process.env["APP_SUPABASE_PUBLISHABLE_KEY"];
    const serviceRoleKey = process.env["APP_SUPABASE_SERVICE_ROLE_KEY"];

    if (!url || !publishableKey || !serviceRoleKey) {
      return {
        ok: false,
        error:
          "Missing one or more APP_SUPABASE_* secrets (URL, publishable key, service role key).",
      };
    }

    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Probe for core tables the app expects (from SETUP_OWN_PROJECT.sql).
    const tables = [
      "profiles",
      "user_roles",
      "projects",
      "quotations",
      "suppliers",
      "items",
    ];
    const missing: string[] = [];
    for (const table of tables) {
      const { error } = await client.from(table).select("id").limit(1);
      if (error) missing.push(`${table} (${error.message})`);
    }

    return {
      ok: missing.length === 0,
      url,
      checkedTables: tables,
      missing,
    };
  },
);
