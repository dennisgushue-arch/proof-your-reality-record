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
    "Co-parenting": "bg-blue-950/60 text-blue-400 border-blue-800/50",
    "Landlord/Tenant": "bg-amber-950/60 text-amber-400 border-amber-800/50",
    "Contractor": "bg-purple-950/60 text-purple-400 border-purple-800/50",
    "Workplace": "bg-emerald-950/60 text-emerald-400 border-emerald-800/50",
    "Insurance": "bg-rose-950/60 text-rose-400 border-rose-800/50",
    "Neighbor": "bg-orange-950/60 text-orange-400 border-orange-800/50",
    "Other": "bg-slate-800/60 text-slate-400 border-slate-700/50",
  };
  return map[c] ?? map.Other;
};
