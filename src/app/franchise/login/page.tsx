"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FRANCHISES, type FranchiseCode } from "@/lib/franchises";

function getFranchiseLogo(code: FranchiseCode) {
  return `/teams/${code}.png`;
}

type FlashPanel = "login" | "team" | null;

export default function FranchiseLoginPage() {
  const router = useRouter();
  const franchisePanelRef = useRef<HTMLElement | null>(null);
  const loginPanelRef = useRef<HTMLElement | null>(null);
  const teamPanelRef = useRef<HTMLElement | null>(null);
  const loginFormRef = useRef<HTMLFormElement | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseCode | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [flashPanel, setFlashPanel] = useState<FlashPanel>(null);

  const selectedFranchiseDetails = useMemo(
    () => FRANCHISES.find((franchise) => franchise.code === selectedFranchise),
    [selectedFranchise],
  );

  const franchiseSnapshot = useMemo(
    () => [
      {
        label: "Franchise Code",
        value: selectedFranchiseDetails?.code ?? "Pending",
      },
      {
        label: "Home Base",
        value: selectedFranchiseDetails?.city ?? "Select a team",
      },
      {
        label: "Access State",
        value: selectedFranchiseDetails?.status ?? "Locked",
      },
      {
        label: "Team ID",
        value: selectedFranchiseDetails?.username ?? "Pre-created",
      },
    ],
    [selectedFranchiseDetails],
  );

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("franchise-login-theme");
    document.body.classList.add("franchise-login-theme");

    return () => {
      document.documentElement.classList.remove("franchise-login-theme");
      document.body.classList.remove("franchise-login-theme");
    };
  }, []);

  function scrollToPanel(panel: HTMLElement | null) {
    panel?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function triggerPanelFlash(panel: Exclude<FlashPanel, null>) {
    setFlashPanel(panel);

    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashPanel(null);
    }, 1000);
  }

  function handleFranchiseButton() {
    scrollToPanel(franchisePanelRef.current);
  }

  function handleSecureButton() {
    scrollToPanel(loginPanelRef.current);

    window.setTimeout(() => {
      if (!selectedFranchise) {
        return;
      }

      if (!username) {
        usernameInputRef.current?.focus();
        return;
      }

      passwordInputRef.current?.focus();
    }, 250);
  }

  function handleLoginButton() {
    scrollToPanel(loginPanelRef.current);
    triggerPanelFlash("login");

    if (!selectedFranchise) {
      setError("Please select a franchise first.");
      scrollToPanel(teamPanelRef.current);
      return;
    }

    if (!username) {
      usernameInputRef.current?.focus();
      return;
    }

    if (!password) {
      passwordInputRef.current?.focus();
      return;
    }

    loginFormRef.current?.requestSubmit();
  }

  function handleSelectTeamButton() {
    scrollToPanel(teamPanelRef.current);
    triggerPanelFlash("team");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFranchise) {
      setError("Please select a franchise first.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/franchise-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          franchiseCode: selectedFranchise,
          username,
          password,
        }),
      });

      const responseBody = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(responseBody.message ?? "Login failed.");
        return;
      }

      router.push(`/franchise/dashboard?team=${selectedFranchise}`);
    } catch {
      setError("Unable to reach the login service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative h-screen overflow-x-hidden overflow-y-auto overscroll-y-none bg-[#01070c] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, rgba(34, 211, 238, 0.14), transparent 26%), radial-gradient(circle at 82% 18%, rgba(6, 182, 212, 0.12), transparent 22%), linear-gradient(145deg, #02080d 0%, #03111a 38%, #071d29 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "repeating-linear-gradient(128deg, rgba(34, 211, 238, 0.1) 0px, rgba(34, 211, 238, 0.1) 20px, transparent 20px, transparent 148px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125, 211, 252, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.18) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(2, 6, 23, 0.08) 42%, rgba(2, 6, 23, 0.82) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-4 py-5 box-border sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.42em] text-cyan-100/80">
              IPL Auction Arena
            </span>

            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
                Franchise Access
              </p>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Franchise Login
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-[#04101a]/80 p-1 shadow-[0_0_28px_rgba(34,211,238,0.12)] backdrop-blur">
              <button
                type="button"
                onClick={handleFranchiseButton}
                className="rounded-full bg-cyan-300 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-slate-950 transition hover:brightness-105 sm:px-5"
              >
                Franchise
              </button>
              <button
                type="button"
                onClick={handleSecureButton}
                className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100/55 transition hover:text-cyan-50 sm:px-5"
              >
                Secure
              </button>
              <button
                type="button"
                onClick={handleLoginButton}
                className="px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100/55 transition hover:text-cyan-50 sm:px-5"
              >
                Login
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSelectTeamButton}
                className="rounded-full border border-cyan-300/18 bg-white/[0.06] px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-50/85 shadow-[0_0_20px_rgba(34,211,238,0.07)] backdrop-blur transition hover:border-cyan-300/35 hover:text-white"
              >
                {selectedFranchiseDetails ? `Select Team ${selectedFranchiseDetails.code}` : "Select Team"}
              </button>
              <Link
                href="/"
                className="rounded-full border border-cyan-300/18 bg-white/[0.06] px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-50/85 shadow-[0_0_20px_rgba(34,211,238,0.07)] backdrop-blur transition hover:border-cyan-300/35 hover:text-white"
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-2">
          <section
            ref={franchisePanelRef}
            className="relative overflow-hidden rounded-[34px] border border-cyan-300/18 bg-[#03111a]/70 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur sm:p-6 lg:col-span-2 lg:p-8"
          >
            <div
              className="absolute inset-0 opacity-75"
              style={{
                background:
                  "radial-gradient(circle at 24% 22%, rgba(125, 211, 252, 0.12), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%)",
              }}
            />

            <div className="relative grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:items-center">
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[0.58rem] font-bold uppercase tracking-[0.38em] text-cyan-100/75">
                    {selectedFranchiseDetails?.status ?? "Awaiting Selection"}
                  </span>
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-cyan-100/45">
                    Franchise War Room
                  </span>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center xl:gap-8">
                  <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-[32px] border border-cyan-300/25 bg-cyan-300/8 shadow-[0_0_36px_rgba(34,211,238,0.12)]">
                    <div className="absolute inset-3 rounded-[24px] border border-cyan-300/18 bg-[#071924]/75" />
                    {selectedFranchiseDetails ? (
                      <Image
                        src={getFranchiseLogo(selectedFranchiseDetails.code)}
                        alt={`${selectedFranchiseDetails.name} logo`}
                        width={96}
                        height={96}
                        className="relative z-10 h-24 w-24 object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.2)]"
                      />
                    ) : (
                      <span className="relative z-10 text-4xl font-black uppercase tracking-[0.18em] text-cyan-100/60">
                        ?
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 max-w-[38rem] space-y-3 pr-2">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/45">
                      Live Auction Entry
                    </p>
                    {selectedFranchiseDetails ? (
                      <h2 className="max-w-full break-words text-[clamp(2.7rem,7vw,4.2rem)] font-black uppercase leading-[1.04] tracking-[0.02em] text-balance text-white">
                        {selectedFranchiseDetails.name}
                      </h2>
                    ) : (
                      <h2 className="max-w-full text-[clamp(1.9rem,5vw,3rem)] font-black uppercase leading-[1.02] tracking-[0.02em] text-white">
                        <span className="block">Choose</span>
                        <span className="mt-1 block">A</span>
                        <span className="mt-1 block">Franchise</span>
                      </h2>
                    )}
                    <p className="pt-1 text-lg font-bold uppercase tracking-[0.24em] text-cyan-300">
                      {selectedFranchiseDetails?.city ?? "Tap a team on the right to continue"}
                    </p>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-7 text-cyan-50/70">
                  Enter your franchise war room to access the bidding dashboard, live auction room,
                  and squad management controls. Select your team, then authenticate with the
                  credentials assigned by the super admin.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {franchiseSnapshot.map((item) => (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-cyan-300/12 bg-white/[0.03] px-4 py-4 shadow-[0_0_24px_rgba(34,211,238,0.05)]"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/45">
                      {item.label}
                    </p>
                    <h3 className="mt-3 text-xl font-black text-cyan-50 sm:text-2xl">
                      {item.value}
                    </h3>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            ref={loginPanelRef}
            className={`rounded-[34px] border bg-[#03111a]/70 p-5 backdrop-blur transition-all duration-300 sm:p-6 lg:p-8 ${
              flashPanel === "login"
                ? "border-cyan-300/70 shadow-[0_0_60px_rgba(34,211,238,0.28)]"
                : "border-cyan-300/18 shadow-[0_0_44px_rgba(34,211,238,0.08)]"
            }`}
          >
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-cyan-300/12" />
              <h2 className="text-center text-[0.82rem] font-black uppercase tracking-[0.46em] text-cyan-200">
                Access Portal 
              </h2>
              <span className="h-px flex-1 bg-cyan-300/12" />
            </div>

            <div className="mt-8 rounded-[28px] border border-cyan-300/35 bg-[#081b27]/90 px-5 py-6 shadow-[0_0_45px_rgba(34,211,238,0.18)]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">
                Active Franchise
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.34em] text-cyan-100/80">
                  {selectedFranchiseDetails?.code ?? "Pending"}
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
                  {selectedFranchiseDetails?.name ?? "No franchise selected"}
                </span>
              </div>
            </div>

            <form ref={loginFormRef} className="mt-8 space-y-5" onSubmit={handleLogin}>
              <label className="block">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100/55">
                  Team ID
                </span>
                <input
                  ref={usernameInputRef}
                  id="franchise-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={selectedFranchiseDetails?.username ?? "Enter team username"}
                  autoComplete="username"
                  required
                  className="mt-3 w-full rounded-[22px] border border-cyan-300/18 bg-[#061520]/90 px-4 py-4 text-sm font-medium text-white outline-none transition placeholder:text-cyan-100/30 focus:border-cyan-300/45 focus:bg-[#071b27]"
                />
              </label>

              <label className="block">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100/55">
                  Password
                </span>
                <input
                  ref={passwordInputRef}
                  id="franchise-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="mt-3 w-full rounded-[22px] border border-cyan-300/18 bg-[#061520]/90 px-4 py-4 text-sm font-medium text-white outline-none transition placeholder:text-cyan-100/30 focus:border-cyan-300/45 focus:bg-[#071b27]"
                />
              </label>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[18px] border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-200"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-[3.5rem] w-full items-center justify-center rounded-[24px] border border-cyan-300/35 bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.34em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.22)] transition hover:shadow-[0_0_34px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Logging In..." : "Enter Auction Room"}
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-cyan-300/12 bg-white/[0.03] px-4 py-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/45">
                Login Note
              </p>
              <p className="mt-3 text-sm leading-6 text-cyan-50/70">
                Team IDs are pre-created for each franchise. Select a team first, then use the
                assigned username and password to unlock the dashboard.
              </p>
            </div>
          </section>

          <section
            ref={teamPanelRef}
            className={`rounded-[34px] border bg-[#03111a]/70 p-5 backdrop-blur transition-all duration-300 sm:p-6 lg:p-8 ${
              flashPanel === "team"
                ? "border-cyan-300/70 shadow-[0_0_60px_rgba(34,211,238,0.28)]"
                : "border-cyan-300/18 shadow-[0_0_44px_rgba(34,211,238,0.08)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[0.82rem] font-black uppercase tracking-[0.46em] text-cyan-200">
                Select Team
              </h2>
              <span className="rounded-full border border-cyan-300/16 bg-white/[0.04] px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/50">
                {FRANCHISES.length} Franchises
              </span>
            </div>

            <div className="mt-7 space-y-3">
              {FRANCHISES.map((franchise) => {
                const isSelected = selectedFranchise === franchise.code;

                return (
                  <button
                    key={franchise.code}
                    type="button"
                    onClick={() => {
                      setSelectedFranchise(franchise.code);
                      setError("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_0_28px_rgba(34,211,238,0.14)]"
                        : "border-cyan-300/12 bg-white/[0.03] hover:border-cyan-300/28 hover:bg-cyan-300/8"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-cyan-300/20 bg-[#081e2b]">
                        <Image
                          src={getFranchiseLogo(franchise.code)}
                          alt={`${franchise.name} logo`}
                          width={34}
                          height={34}
                          className="h-[34px] w-[34px] object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold uppercase tracking-[0.18em] text-cyan-50">
                          {franchise.code}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-cyan-100/50">
                          {franchise.city}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-cyan-300">{franchise.name}</p>
                      <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cyan-100/45">
                        {franchise.status}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
