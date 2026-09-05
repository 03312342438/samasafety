import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Temporary diagnostics endpoint: verifies the user-provided APP_SUPABASE_*
// credentials and checks whether the expected schema exists on that project.
export const Route = createFileRoute("/api/public/check-own-supabase")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["APP_SUPABASE_URL"];
        const publishableKey = process.env["APP_SUPABASE_PUBLISHABLE_KEY"];
        const serviceRoleKey = process.env["APP_SUPABASE_SERVICE_ROLE_KEY"];

        if (!url || !publishableKey || !serviceRoleKey) {
          return Response.json({
            ok: false,
            error:
              "Missing one or more APP_SUPABASE_* secrets (URL, publishable key, service role key).",
          });
        }

        const client = createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

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
          const { error } = await client.from(table).select("*").limit(1);
          if (error) missing.push(`${table} (${error.message})`);
        }

        return Response.json({
          ok: missing.length === 0,
          url,
          checkedTables: tables,
          missing,
        });
      },
    },
  },
});
