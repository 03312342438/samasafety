import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  report_id: z.string().uuid(),
  pdf_base64: z.string().min(1).max(12_000_000),
  image_base64: z.string().min(1).max(12_000_000),
});

export const emailReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { sendSavedReportEmail } = await import("@/lib/report-email.server");
    return sendSavedReportEmail({ supabase: context.supabase, userId: context.userId, reportId: data.report_id, kind: "maintenance", pdf: data.pdf_base64, image: data.image_base64 });
  });

export const emailCallout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { sendSavedReportEmail } = await import("@/lib/report-email.server");
    return sendSavedReportEmail({ supabase: context.supabase, userId: context.userId, reportId: data.report_id, kind: "callout", pdf: data.pdf_base64, image: data.image_base64 });
  });