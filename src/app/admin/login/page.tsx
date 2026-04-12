"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <span className="badge">IPL Auction Arena</span>
        <Link href="/" className="ghost-button">
          Back
        </Link>
      </div>

      <section className="auth-panel">
        <h1>Admin Login</h1>
        <p>Use Supabase Auth credentials for auction control access.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
