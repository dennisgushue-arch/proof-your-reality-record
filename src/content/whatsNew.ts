export type WhatsNewItem = {
  id: string;
  version: string;
  title: string;
  summary: string;
  dateLabel: string;
};

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    id: "v1-1-3-release",
    version: "v1.1.3",
    title: "Cleaner review flow",
    summary: "Removed heat map visuals and simplified dashboard review surfaces for a more focused intelligence workflow.",
    dateLabel: "July 2026",
  },
  {
    id: "v1-1-2-playback",
    version: "v1.1.2",
    title: "Playback navigation improved",
    summary: "Incident Playback now includes a direct path back to the dashboard, with clearer typography in key screens.",
    dateLabel: "July 2026",
  },
  {
    id: "v1-1-1-billing",
    version: "v1.1.1",
    title: "Flexible billing options",
    summary: "Pricing now supports recurring subscriptions, prepaid access options, and top-ups for longer case timelines.",
    dateLabel: "July 2026",
  },
];
