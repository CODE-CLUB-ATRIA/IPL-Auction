'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import { teamGradients } from "@/constants/teamColors";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";
import FranchisePlayerTile from "@/components/FranchisePlayerTile";

type TeamRow = {
  franchise_code: string;
  name: string;
  city: string;
  purse_lakhs: number;
  spent_lakhs: number;
  roster_count: number;
  is_blocked: boolean;
};

type ViewMode = "squad" | "market" | "strategy";

const VIEW_LABELS: Record<ViewMode, string> = {
  squad: "Squad",
  market: "Market",
  strategy: "Strategy",
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the franchise dashboard.";
};

const formatCr = (amountInLakhs: number): string => {
  if (amountInLakhs >= 100) {
    return `Rs ${(amountInLakhs / 100).toFixed(amountInLakhs % 100 === 0 ? 1 : 2)} Cr`;
  }

  return `Rs ${amountInLakhs} L`;
};

const sortPlayers = (players: Player[]): Player[] => {
  return [...players].sort((leftPlayer, rightPlayer) => {
    if (leftPlayer.slNo !== null && rightPlayer.slNo !== null) {
      return leftPlayer.slNo - rightPlayer.slNo;
    }

    if (leftPlayer.slNo !== null) return -1;
    if (rightPlayer.slNo !== null) return 1;
    return leftPlayer.name.localeCompare(rightPlayer.name);
  });
};

const getStorageKey = (teamCode: FranchiseCode) => `franchise-strategy-${teamCode}`;

const themeByFranchise: Record<FranchiseCode, { accent: string; accentSoft: string; surface: string; border: string; text: string; mutedText: string }> = {
  CSK: { accent: "#ffd200", accentSoft: "#fff0a8", surface: "#fffbe6", border: "#d4b12a", text: "#1e2f57", mutedText: "#6f6529" },
  MI: { accent: "#0a2a66", accentSoft: "#c7d8ff", surface: "#f3f8ff", border: "#16408e", text: "#0a2a66", mutedText: "#4a5d84" },
  RCB: { accent: "#ff1a1a", accentSoft: "#ffd1d1", surface: "#fff2f2", border: "#b70f0f", text: "#111111", mutedText: "#7a2323" },
  KKR: { accent: "#5b2da3", accentSoft: "#ead8ff", surface: "#faf5ff", border: "#7b47c7", text: "#24103f", mutedText: "#694f8e" },
  SRH: { accent: "#ff7a00", accentSoft: "#ffe0bf", surface: "#fff8ef", border: "#c55c00", text: "#411700", mutedText: "#82512b" },
  RR: { accent: "#ff8fb2", accentSoft: "#ffe2eb", surface: "#fff8fb", border: "#ce6e8e", text: "#5f1734", mutedText: "#8a5670" },
  PBKS: { accent: "#d71920", accentSoft: "#ffd0d0", surface: "#fff4f4", border: "#a61a1f", text: "#52050a", mutedText: "#7c3a3d" },
  DC: { accent: "#1d4ed8", accentSoft: "#dbe7ff", surface: "#f4f8ff", border: "#2c65e3", text: "#12316b", mutedText: "#52648f" },
  LSG: { accent: "#0b5fa5", accentSoft: "#cde9ff", surface: "#f4fbff", border: "#1672c2", text: "#0b355b", mutedText: "#4d6a84" },
  GT: { accent: "#c9a74e", accentSoft: "#f4e4bb", surface: "#fffaf0", border: "#93752f", text: "#2b2616", mutedText: "#6d5c34" },
};

const getFranchiseTheme = (code: FranchiseCode) => themeByFranchise[code];

function FranchiseDashboardContent() {
  const searchParams = useSearchParams();
  const team = searchParams.get("team") as FranchiseCode | null;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("squad");
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const teamRow = useMemo(
    () => teams.find((entry) => entry.franchise_code === team) ?? null,
    [teams, team],
  );

  const squadPlayers = useMemo(
    () => sortPlayers(players.filter((player) => player.assignedFranchiseCode === team)),
    [players, team],
  );

  const marketPlayers = useMemo(
    () => sortPlayers(players.filter((player) => !player.assignedFranchiseCode)),
    [players],
  );

  const strategyPlayers = useMemo(
    () => squadPlayers.filter((player) => selectedStrategyIds.includes(player.id)),
    [selectedStrategyIds, squadPlayers],
  );

  useEffect(() => {
    if (!team) {
      return;
    }

    const storedValue = window.localStorage.getItem(getStorageKey(team));
    if (storedValue) {
      try {
        const parsedValue = JSON.parse(storedValue) as string[];
        setSelectedStrategyIds(parsedValue.slice(0, 2));
      } catch {
        setSelectedStrategyIds([]);
      }
    } else {
      setSelectedStrategyIds([]);
    }
  }, [team]);

  useEffect(() => {
    if (!team) {
      return;
    }

    window.localStorage.setItem(getStorageKey(team), JSON.stringify(selectedStrategyIds));
  }, [selectedStrategyIds, team]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [{ data: playersData, error: playersError }, { data: teamsData, error: teamsError }, { data: stateData, error: stateError }] =
          await Promise.all([
            supabase.from("players").select("*").order("sl_no", { ascending: true }),
            supabase.from("teams").select("*").order("franchise_code", { ascending: true }),
            supabase.from("auction_state").select("*").limit(1).maybeSingle(),
          ]);

        if (playersError) throw playersError;
        if (teamsError) throw teamsError;
        if (stateError) throw stateError;

        const nextPlayers = sortPlayers(((playersData ?? []) as PlayerRow[]).map((row) => mapPlayerRow(row)));
        const nextTeams = (teamsData ?? []) as TeamRow[];
        const nextAuctionState = stateData ? mapAuctionStateRow(stateData as Record<string, unknown>) : null;

        if (!isMounted) {
          return;
        }

        setPlayers(nextPlayers);
        setTeams(nextTeams);
        setAuctionState(nextAuctionState);
        setSelectedStrategyIds((currentIds) =>
          currentIds.filter((playerId) => nextPlayers.some((player) => player.id === playerId && player.assignedFranchiseCode === team)).slice(0, 2),
        );
        setErrorMessage("");
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPlayers([]);
          setTeams([]);
          setAuctionState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    const channel = supabase
      .channel("franchise_dashboard_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [team]);

  const teamBudget = teamRow?.purse_lakhs ?? 1000;
  const teamSpent = teamRow?.spent_lakhs ?? 0;
  const teamCount = teamRow?.roster_count ?? squadPlayers.length;
  const teamRemaining = Math.max(teamBudget - teamSpent, 0);
  const theme = franchise ? getFranchiseTheme(franchise.code) : getFranchiseTheme("CSK");
  const gradients = franchise ? teamGradients[franchise.code] : teamGradients.CSK;

  const toggleStrategyPlayer = (playerId: string) => {
    setSelectedStrategyIds((currentIds) => {
      if (currentIds.includes(playerId)) {
        return currentIds.filter((id) => id !== playerId);
      }

      if (currentIds.length >= 2) {
        return currentIds;
      }

      return [...currentIds, playerId];
    });
  };

  if (!franchise) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Franchise Dashboard</h1>
          <p>Please login from the franchise screen to access your team dashboard.</p>
          <Link href="/franchise/login" className="primary-button">
            Go To Franchise Login
          </Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Loading {franchise.name}</h1>
          <p>Fetching live squad and market data from Supabase.</p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="dashboard-shell franchise-dashboard-shell franchise-themed-shell"
      style={{
        ["--franchise-accent" as string]: theme.accent,
        ["--franchise-accent-soft" as string]: theme.accentSoft,
        ["--franchise-surface" as string]: theme.surface,
        ["--franchise-border" as string]: theme.border,
        ["--franchise-text" as string]: theme.text,
        ["--franchise-muted" as string]: theme.mutedText,
        ["--franchise-gradient-start" as string]: gradients[0],
        ["--franchise-gradient-end" as string]: gradients[1],
      } as CSSProperties}
    >
      <div className="auth-topbar">
        <span className="badge franchise-brand-badge">Logo / Title</span>
        <div className="franchise-topbar-center badge franchise-auction-pill">Up For Auction</div>
        <div className="topbar-right">
          <span className="badge subtle">{franchise.name}</span>
          <Link href="/franchise/login" className="ghost-button">
            Switch Team
          </Link>
        </div>
      </div>

      <div className="franchise-dashboard-scroll">
        {errorMessage ? <section className="dashboard-card dashboard-card--wide">{errorMessage}</section> : null}

        <section className="franchise-team-board">
          <section className="franchise-team-summary">
            <div className="team-summary-main">
              <div className="team-avatar" aria-hidden="true" />
              <div>
                <h1>Team Name</h1>
                <p className="team-name-sub">{franchise.name}</p>
                <p>{teamCount} / 25 Players Signed</p>
              </div>
            </div>

            <div className="team-purse-strip">
              <article>
                <span>Total Budget</span>
                <strong>{formatCr(teamBudget)}</strong>
              </article>
              <article>
                <span>Spent</span>
                <strong>{formatCr(teamSpent)}</strong>
              </article>
              <article>
                <span>Remaining</span>
                <strong>{formatCr(teamRemaining)}</strong>
              </article>
            </div>
          </section>

          <div className="franchise-action-row">
            {(["squad", "market", "strategy"] as ViewMode[]).map((nextView) => (
              <button
                key={nextView}
                type="button"
                className={`sketch-tab ${viewMode === nextView ? "active" : ""}`}
                onClick={() => setViewMode(nextView)}
              >
                {VIEW_LABELS[nextView]}
              </button>
            ))}
            <Link
              href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
              className="primary-button live-auction-cta"
            >
              Enter Live Auction
            </Link>
          </div>

          {viewMode === "squad" ? (
            <section className="franchise-player-grid" aria-label="Team squad list">
              {squadPlayers.length ? (
                squadPlayers.map((player) => <FranchisePlayerTile key={player.id} player={player} theme={theme} />)
              ) : (
                <article className="dashboard-card dashboard-card--wide">No squad players yet.</article>
              )}
            </section>
          ) : null}

          {viewMode === "market" ? (
            <section className="franchise-player-grid" aria-label="Auction market list">
              {marketPlayers.length ? (
                marketPlayers.map((player) => <FranchisePlayerTile key={player.id} player={player} theme={theme} />)
              ) : (
                <article className="dashboard-card dashboard-card--wide">All players are currently assigned.</article>
              )}
            </section>
          ) : null}

          {viewMode === "strategy" ? (
            <section className="space-y-4">
              <div className="dashboard-card dashboard-card--wide">
                <p className="text-sm uppercase tracking-[0.24em]" style={{ color: "var(--franchise-accent)" }}>Strategy picks</p>
                <h2 className="mt-2 text-2xl font-black">Choose two players from your squad</h2>
                <p className="mt-2 text-sm text-[#d4ddef]">Only two can be selected. Your team colors are used across the board.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {strategyPlayers.map((player, index) => (
                    <span
                      key={player.id}
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                        index === 0 ? "text-white" : "text-[#111111]"
                      }`}
                      style={{
                        background: index === 0 ? "var(--franchise-accent)" : "var(--franchise-accent-soft)",
                      }}
                    >
                      {player.name}
                    </span>
                  ))}
                  {!strategyPlayers.length ? <span className="text-sm text-[#d4ddef]">Select two players from the squad below.</span> : null}
                </div>
              </div>

              <section className="franchise-player-grid" aria-label="Strategy player selection">
                {squadPlayers.length ? (
                  squadPlayers.map((player) => {
                    return (
                      <FranchisePlayerTile
                        key={player.id}
                        player={player}
                        theme={theme}
                        onClick={() => toggleStrategyPlayer(player.id)}
                      />
                    );
                  })
                ) : (
                  <article className="dashboard-card dashboard-card--wide">No squad players yet.</article>
                )}
              </section>
            </section>
          ) : null}

          <section className="dashboard-card dashboard-card--wide">
            <h2>Live Auction State</h2>
            <p>Current Player: {auctionState?.current_player_id ?? "None"}</p>
            <p>Current Bid: {formatCr(auctionState?.current_bid ?? 0)}</p>
            <p>Status: {auctionState?.status ?? "idle"}</p>
          </section>
        </section>
      </div>
    </main>
  );
}

export default function FranchiseDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-shell">
          <section className="dashboard-card">
            <h1>Loading Franchise Dashboard</h1>
            <p>Preparing live team data.</p>
          </section>
        </main>
      }
    >
      <FranchiseDashboardContent />
    </Suspense>
  );
}
