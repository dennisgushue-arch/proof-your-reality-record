export const CATEGORIES = [
  "Co-parenting",
  "Landlord/Tenant",
  "Contractor",
  "Workplace",
  "Insurance",
  "Neighbor",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];

export const categoryColor = (c: string) => {
  const map: Record<string, string> = {
    "Co-parenting": "bg-blue-50 text-blue-700 border-blue-200",
    "Landlord/Tenant": "bg-amber-50 text-amber-700 border-amber-200",
    "Contractor": "bg-purple-50 text-purple-700 border-purple-200",
    "Workplace": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Insurance": "bg-rose-50 text-rose-700 border-rose-200",
    "Neighbor": "bg-orange-50 text-orange-700 border-orange-200",
    "Other": "bg-slate-100 text-slate-700 border-slate-200",
  };
  return map[c] ?? map.Other;
};
