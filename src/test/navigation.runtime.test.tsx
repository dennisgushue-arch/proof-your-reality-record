import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";

const authState = {
  user: null as null | { id: string },
  loading: false,
  session: null,
  signOut: vi.fn(async () => {}),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

describe("ProtectedRoute runtime behavior", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("redirects unauthenticated users to /auth", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Auth Page")).toBeInTheDocument();
  });

  it("shows loading state while auth is resolving", () => {
    authState.loading = true;

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div>Secret Area</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Verifying your secure session…")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Keeping your private records scoped to your account.");
  });

  it("renders protected content for authenticated users", () => {
    authState.user = { id: "user-1" };

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute>
          <div>Secret Area</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secret Area")).toBeInTheDocument();
  });
});

describe("AppHeader navigation controls", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    authState.signOut.mockClear();
  });

  it("shows public navigation links when signed out", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/auth");
    expect(screen.getByRole("link", { name: /pricing/i })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: /start recording/i })).toHaveAttribute("href", "/auth?mode=signup");
  });

  it("shows authenticated navigation links and sign-out action", async () => {
    authState.user = { id: "user-1" };

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppHeader />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(await screen.findByRole("link", { name: /pricing/i })).toHaveAttribute("href", "/pricing");
    expect(await screen.findByRole("link", { name: /account/i })).toHaveAttribute("href", "/account");

    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(authState.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
