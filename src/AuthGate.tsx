import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthSessionContext } from "./authSession";
import { supabase } from "./supabase";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setSession(data.session);
      setError(sessionError?.message ?? "");
      setCheckingSession(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setBusy(true);
    setStatus("");
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setStatus("Check your email for a secure sign-in link.");
    }
    setBusy(false);
  };

  const signOut = async () => {
    setBusy(true);
    setError("");
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (signOutError) setError(signOutError.message);
    setBusy(false);
  };

  if (checkingSession) {
    return (
      <main className="auth-shell" aria-busy="true">
        <p className="auth-loading" role="status">
          Opening your tracker…
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="eyebrow">Progress</p>
          <h1 id="auth-title">Your progress, wherever you are.</h1>
          <p className="auth-intro">
            Enter your email and we’ll send you a secure sign-in link—no
            password needed.
          </p>

          <form className="auth-form" onSubmit={sendMagicLink}>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>

          {status && (
            <p className="auth-message auth-message--success" role="status">
              {status}
            </p>
          )}
          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <AuthSessionContext.Provider value={session}>
      <aside className="account-bar" aria-label="Signed-in account">
        <span>{session.user.email}</span>
        <button type="button" onClick={signOut} disabled={busy}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
        {error && <span role="alert">{error}</span>}
      </aside>
      {children}
    </AuthSessionContext.Provider>
  );
}
