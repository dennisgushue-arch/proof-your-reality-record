import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState = {
  user: null as null | { id: string },
  loading: false,
  session: null,
  signOut: vi.fn(async () => {}),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
    },
  },
}));

const renderAuth = async (env: {
  mode: "development" | "production";
  google: "true" | "false";
  facebook: "true" | "false";
  apple: "true" | "false";
  route?: string;
}) => {
  vi.resetModules();
  vi.stubEnv("MODE", env.mode);
  vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", env.google);
  vi.stubEnv("VITE_AUTH_FACEBOOK_ENABLED", env.facebook);
  vi.stubEnv("VITE_AUTH_APPLE_ENABLED", env.apple);

  const { default: Auth } = await import("@/pages/Auth");

  render(
    <MemoryRouter initialEntries={[env.route ?? "/auth"]}>
      <Auth />
    </MemoryRouter>,
  );
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Auth social providers + debug panel", () => {
  it("toggles password visibility with accessible eye control", async () => {
    await renderAuth({
      mode: "development",
      google: "false",
      facebook: "false",
      apple: "false",
      route: "/auth",
    });

    const passwordInput = screen.getByLabelText(/^password$/i, { selector: "input" });
    expect(passwordInput).toHaveAttribute("type", "password");

    const showButton = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(showButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    const hideButton = screen.getByRole("button", { name: /hide password/i });
    fireEvent.click(hideButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows non-production debug panel and provider status", async () => {
    await renderAuth({
      mode: "development",
      google: "true",
      facebook: "false",
      apple: "false",
      route: "/auth?debugAuth=1",
    });

    expect(screen.getByText(/auth providers debug/i)).toBeInTheDocument();
    expect(screen.getByText(/mode: development/i)).toBeInTheDocument();
    expect(screen.getByText(/shareable url/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy debug url/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open debug route/i })).toBeInTheDocument();
    const statuses = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(statuses.some((text) => /google\s*:\s*enabled/i.test(text))).toBe(true);
    expect(statuses.some((text) => /facebook\s*:\s*disabled/i.test(text))).toBe(true);
    expect(statuses.some((text) => /apple\s*:\s*disabled/i.test(text))).toBe(true);

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with facebook/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with apple/i })).not.toBeInTheDocument();
  });

  it("hides debug panel in production and shows enabled providers", async () => {
    await renderAuth({
      mode: "production",
      google: "true",
      facebook: "true",
      apple: "true",
      route: "/auth?debugAuth=1",
    });

    expect(screen.queryByText(/auth providers debug/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy debug url/i })).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with facebook/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeInTheDocument();
  });

  it("hides debug panel in non-production when debugAuth query is absent", async () => {
    await renderAuth({
      mode: "development",
      google: "true",
      facebook: "false",
      apple: "false",
    });

    expect(screen.queryByText(/auth providers debug/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy debug url/i })).not.toBeInTheDocument();
  });
});
