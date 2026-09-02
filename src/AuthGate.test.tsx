// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://127.0.0.1:5173/" }

import type { Session } from "@supabase/supabase-js";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth,
  },
}));

beforeEach(() => {
  auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: auth.unsubscribe } },
  });
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("authentication gate", () => {
  it("sends a magic link to a trimmed email address", async () => {
    const user = userEvent.setup();
    render(
      <AuthGate>
        <p>Private tracker</p>
      </AuthGate>,
    );

    const email = await screen.findByLabelText("Email address");
    await user.type(email, "  person@example.com  ");
    await user.click(
      screen.getByRole("button", { name: "Email me a sign-in link" }),
    );

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      options: { emailRedirectTo: "http://127.0.0.1:5173/" },
    });
    expect(
      await screen.findByText("Check your email for a secure sign-in link."),
    ).toBeTruthy();
    expect(screen.queryByText("Private tracker")).toBeNull();
  });

  it("restores a session and signs out only this browser", async () => {
    const user = userEvent.setup();
    auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { email: "person@example.com" },
        } as Session,
      },
      error: null,
    });

    render(
      <AuthGate>
        <p>Private tracker</p>
      </AuthGate>,
    );

    expect(await screen.findByText("Private tracker")).toBeTruthy();
    expect(screen.getByText("person@example.com")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() =>
      expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }),
    );
  });
});
