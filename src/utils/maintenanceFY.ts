// Indian Financial Year helpers + maintenance entry validation rules.
// FY rule: Apr 1 → Mar 31. e.g. 2024-04-01 to 2025-03-31 = FY 2024-25 (label "FY 2024-25").
import { supabase } from '@/integrations/supabase/client';

export const MAX_DUE_PER_FY = 10000;

export type FY = { startYear: number; endYear: number; label: string };

export const fyForDate = (d: Date | string): FY => {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based: 0=Jan, 3=April
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return { startYear, endYear, label: `FY ${startYear}-${String(endYear).slice(2)}` };
};

export const fyRange = (fy: FY) => ({
  start: `${fy.startYear}-04-01`,
  endExclusive: `${fy.endYear}-04-01`,
});

// Returns the existing "main" (non-paid) maintenance entry for a resident in a given FY,
// based on paid_date OR created_at falling inside the FY window.
// "Main" = status != 'paid' (i.e. pending / partial / overdue), excluding due-clearance receipts.
export const findExistingMainEntryForFY = async (residentId: string, dateStr: string) => {
  const fy = fyForDate(dateStr);
  const { start, endExclusive } = fyRange(fy);

  // Pull all entries for this resident that intersect FY by paid_date OR created_at
  const { data, error } = await supabase
    .from('maintenance_collections')
    .select('*')
    .eq('resident_id', residentId)
    .or(
      `and(paid_date.gte.${start},paid_date.lt.${endExclusive}),` +
      `and(paid_date.is.null,created_at.gte.${start},created_at.lt.${endExclusive})`
    );

  if (error) return { fy, existing: null as any, totalDue: 0 };

  const rows = data || [];
  // The "main" entry is the non-paid one; if multiple, prefer the earliest.
  const mains = rows.filter((r: any) => r.status !== 'paid');
  mains.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const existing = mains[0] || null;
  const totalDue = rows.reduce((s: number, r: any) => s + Number(r.due_amount || 0), 0);
  return { fy, existing, totalDue };
};
