export type WhatsNewItem = {
  id: string;
  version: string;
  date: string;
  title: string;
  detail: string;
};

// Non-logic content file: safe for release-note edits without touching UI component code.
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    id: "social-auth",
    version: "v0.9.0",
    date: "2026-06-09",
    title: "Social sign-in controls",
    detail: "Google/Facebook/Apple sign-in now supports provider-level visibility flags for safer staged rollout.",
  },
  {
    id: "accessibility-pass",
    version: "v0.9.0",
    date: "2026-06-09",
    title: "Keyboard accessibility pass",
    detail: "Skip-links, clearer focus states, and improved navigation flow were added across key evidence pages.",
  },
  {
    id: "password-toggle",
    version: "v0.9.0",
    date: "2026-06-09",
    title: "Password visibility toggle",
    detail: "Auth now includes an accessible show/hide password control to reduce login mistakes.",
  },
];
