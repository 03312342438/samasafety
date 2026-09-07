/** Generate the next `PREFIX-YYYY-NNNN` reference for a table/column. */
export async function nextSequence(
  supabase: any,
  table: string,
  column: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const { data } = await supabase
    .from(table)
    .select(column)
    .like(column, like)
    .order(column, { ascending: false })
    .limit(1);
  const last = (data ?? [])[0]?.[column] as string | undefined;
  const lastNum = last ? parseInt(last.split("-").pop() ?? "0", 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

/** Initials of a person's name: "Muhammad Ali" -> "MA". */
export function initialsOf(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "XX";
  const letters = parts.map((p) => p[0]!.toUpperCase()).join("");
  return letters.slice(0, 3);
}

/**
 * SAMA quotation reference: `SAMA/MA/26/1234`
 * 1 = SAMA, 2 = preparer initials, 3 = two-digit year, 4 = unique running number.
 */
export async function nextQuotationRef(supabase: any, initials: string): Promise<string> {
  const code = (initials || "XX").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "XX";
  const yy = String(new Date().getFullYear()).slice(-2);
  const { data } = await supabase.from("quotations").select("reference").like("reference", "SAMA/%");
  let max = 0;
  for (const row of (data ?? []) as { reference: string }[]) {
    const tail = parseInt((row.reference ?? "").split("/").pop() ?? "0", 10);
    if (Number.isFinite(tail) && tail > max) max = tail;
  }
  return `SAMA/${code}/${yy}/${max + 1}`;
}
