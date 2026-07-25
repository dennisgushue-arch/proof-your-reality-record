import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Auth from "@/pages/Auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string },
  session: null as null | { access_token: string },
  loading: false,
  signOut: vi.fn(async () => {}),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

const mockedAuth = vi.mocked(supabase.auth);
const mockedToast = vi.mocked(toast);

function renderAuth(initialEntry = "/auth") {
  window.history.pushState({}, "", initialEntry);

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Auth forgot-password and reset-password flow", () => {
  let authStateCallback: ((event: string, session: { access_token: string } | null) => void) | null;

  beforeEach(() => {
    authStateCallback = null;
    authState.user = null;
    authState.session = null;
    authState.loading = false;
    vi.clearAllMocks();
    mockedAuth.signInWithPassword.mockResolvedValue({ error: null } as never);
    mockedAuth.signUp.mockResolvedValue({ error: null } as never);
    mockedAuth.resetPasswordForEmail.mockResolvedValue({ error: null } as never);
    mockedAuth.updateUser.mockResolvedValue({ error: null } as never);
    mockedAuth.getSession.mockResolvedValue({ data: { session: null } } as never);
    mockedAuth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback as typeof authStateCallback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as never;
    });
  });

  it("switches from sign-in to forgot-password mode", () => {
    renderAuth();

    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));

    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to sign in/i })).toBeInTheDocument();
  });

  it("calls resetPasswordForEmail with the origin-based reset redirect and shows a neutral success message", async () => {
    renderAuth();

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockedAuth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });
    });
    expect(mockedToast.success).toHaveBeenCalledWith("If an account exists for that email, a password reset link has been sent.");
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("renders reset-password mode from the URL when a recovery session exists", async () => {
    authState.session = { access_token: "recovery-token" };
    mockedAuth.getSession.mockResolvedValue({ data: { session: authState.session } } as never);

    renderAuth("/auth?mode=reset-password");

    expect(await screen.findByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("handles the PASSWORD_RECOVERY auth event without marking the reset link invalid", async () => {
    let resolveSession: (value: { data: { session: null } }) => void = () => {};
    mockedAuth.getSession.mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }) as never);

    renderAuth("/auth?mode=reset-password&type=recovery");

    expect(await screen.findByRole("status")).toHaveTextContent(/preparing your secure reset form/i);
    act(() => {
      authStateCallback?.("PASSWORD_RECOVERY", { access_token: "recovery-token" });
      resolveSession({ data: { session: null } });
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeEnabled();
  });

  it("validates password mismatch before calling updateUser", async () => {
    authState.session = { access_token: "recovery-token" };
    mockedAuth.getSession.mockResolvedValue({ data: { session: authState.session } } as never);

    renderAuth("/auth?mode=reset-password");

    fireEvent.change(await screen.findByLabelText(/^new password$/i), { target: { value: "newpass1" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "newpass2" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith("Passwords do not match");
    });
    expect(mockedAuth.updateUser).not.toHaveBeenCalled();
  });

  it("calls updateUser and redirects to dashboard after a successful password reset with a valid session", async () => {
    authState.user = { id: "user-1" };
    authState.session = { access_token: "recovery-token" };
    mockedAuth.getSession.mockResolvedValue({ data: { session: authState.session } } as never);

    renderAuth("/auth?mode=reset-password");

    fireEvent.change(await screen.findByLabelText(/^new password$/i), { target: { value: "newpass1" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "newpass1" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockedAuth.updateUser).toHaveBeenCalledWith({ password: "newpass1" });
    });
    expect(mockedToast.success).toHaveBeenCalledWith("Password updated", {
      description: "You can continue to your dashboard.",
    });
    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("shows an invalid or expired reset-link message with a way to request another email", async () => {
    mockedAuth.getSession.mockResolvedValue({ data: { session: null } } as never);

    renderAuth("/auth?mode=reset-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid or has expired/i);
    expect(screen.getByRole("button", { name: /request another reset link/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /request another reset link/i }));

    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
