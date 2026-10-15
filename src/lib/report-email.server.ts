const escape = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export async function sendSavedReportEmail(opts: { supabase: any; userId: string; reportId: string; kind: "maintenance" | "callout"; pdf: string; image: string }) {
  const table = opts.kind === "maintenance" ? "reports" : "callout_reports";
  const { data: row, error } = await opts.supabase.from(table).select("*").eq("id", opts.reportId).single();
  if (error || !row) throw new Error(error?.message ?? "Report not found");
  if (row.created_by !== opts.userId) {
    const { data: admin } = await opts.supabase.from("user_roles").select("role").eq("user_id", opts.userId).eq("role", "admin").maybeSingle();
    if (!admin) throw new Error("Only the report creator or Management can email this report.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: recipients, error: recipientError } = await supabaseAdmin.from("report_recipients").select("email");
  if (recipientError) throw new Error(recipientError.message);
  const client = String(row.client_email ?? "").trim();
  const to = Array.from(new Set<string>([...(recipients ?? []).map((r) => r.email), client].map((e) => String(e).trim().toLowerCase()).filter(Boolean)));
  if (!to.length) return { sent: false, count: 0, to: [], failed: [], reason: "no_recipients" };
  const key = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!key || !lovableKey) throw new Error("Report email connection is not configured");
  const address = (process.env.RESEND_FROM_EMAIL ?? "").match(/[^\s<>"]+@[^\s<>"]+\.[^\s<>"]+/)?.[0];
  if (!address) throw new Error("Report sender address is not configured");
  const name = (process.env.RESEND_FROM_NAME ?? "Sama Safety & Security").replace(/[\r\n"]/g, "");
  const reference = opts.kind === "maintenance" ? row.msr_no : row.reference;
  const title = opts.kind === "maintenance" ? "Maintenance Report" : "Call-out Report";
  const filename = `${opts.kind === "maintenance" ? "MSR" : "Callout"}_${String(reference).replace(/[^a-z0-9_-]/gi, "")}.pdf`;
  const performedBy = row.performed_by || row.technician_sign_name || "";
  const detailRow = (label: string, value: unknown) =>
    value ? `<tr><td style="padding:4px 16px 4px 0;color:#64748b;white-space:nowrap">${escape(label)}</td><td style="padding:4px 0;font-weight:600;color:#113f57">${escape(value)}</td></tr>` : "";
  const details = `
    <table style="border-collapse:collapse;font-size:14px;margin:0 0 16px">
      ${detailRow("Client", row.client_name)}
      ${detailRow("Project", row.project)}
      ${detailRow("Site / Location", row.site_location)}
      ${detailRow(opts.kind === "maintenance" ? "M.S.R No." : "Call-out No.", reference)}
      ${detailRow("Performed by", performedBy)}
      ${detailRow("Client email", row.client_email)}
    </table>`;
  // The inline preview is captured from the very same SAMA sheet as the PDF.
  const html = `<div style="background:#ffffff;font-family:Arial,Helvetica,sans-serif;max-width:794px;margin:auto"><p style="color:#113f57;font-size:16px;font-weight:bold;margin:0 0 12px">${escape(title)} — ${escape(reference)}</p>${details}<img src="cid:sama-report" alt="${escape(title)} ${escape(reference)} — full report is attached as PDF" width="794" style="display:block;width:100%;max-width:794px;height:auto"></div>`;
  const delivered: string[] = [];
  const failed: string[] = [];
  for (const recipient of to) {
    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key },
      body: JSON.stringify({ from: `"${name}" <${address}>`, to: [recipient], subject: `${title} — ${reference}`, html, ...(client ? { reply_to: client } : {}), attachments: [{ filename, content: opts.pdf }, { filename: "sama-report.png", content: opts.image, content_id: "sama-report" }] }),
    });
    if (response.ok) delivered.push(recipient);
    else {
      const body = await response.text();
      console.error(`Report email failed [${response.status}]: ${body}`);
      failed.push(`${recipient}: Resend send failed (${response.status}): ${body}`);
    }
  }
  if (!delivered.length) throw new Error(failed.join(" | ") || "Email send failed");
  return { sent: true, count: delivered.length, to: delivered, failed, reason: "" };
}