'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FRANCHISES, FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

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

const VIEW_DETAILS: Record<ViewMode, { eyebrow: string; title: string; empty: string }> = {
  squad: {
    eyebrow: "Signed players",
    title: "Team Roster",
    empty: "No squad players yet.",
  },
  market: {
    eyebrow: "Auction pool",
    title: "Available Lots",
    empty: "All players are currently assigned.",
  },
  strategy: {
    eyebrow: "Shortlist",
    title: "Strategy Picks",
    empty: "No squad players yet.",
  },
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

function FranchiseDashboardLoading({
  title = "Loading Franchise Dashboard",
  subtitle = "Syncing live squad and market data.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <main className="dashboard-shell franchise-dashboard-shell arena-dashboard-shell arena-loading-shell">
      <header className="franchise-arena-header">
        <div className="franchise-arena-topline">
          <span className="arena-brand-pill">IPL Auction Arena</span>
          <span className="arena-live-pill">Up For Auction</span>
          <div className="arena-nav arena-loading-tabs" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="franchise-arena-title-row">
          <div className="franchise-title-block">
            <p>Franchise Room</p>
            <h1>{title}</h1>
          </div>
          <div className="arena-team-actions arena-loading-actions" aria-hidden="true">
            <span />
            <span />
          </div>
        </div>
      </header>

      <section className="arena-loading-stage" aria-live="polite">
        <div className="arena-loading-mark" aria-hidden="true">
          <span />
        </div>
        <p>Control room</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </section>

      <section className="arena-loading-grid" aria-hidden="true">
        <div className="arena-panel arena-loading-card">
          <span />
          <strong />
          <i />
          <i />
          <i />
        </div>
        <div className="arena-panel arena-loading-card is-center">
          <span />
          <strong />
          <i />
          <i />
          <i />
        </div>
        <div className="arena-panel arena-loading-card">
          <span />
          <strong />
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  );
}

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

  const currentPlayer = useMemo(
    () => players.find((player) => player.id === auctionState?.current_player_id) ?? null,
    [auctionState?.current_player_id, players],
  );

  const soldPlayersCount = useMemo(
    () => players.filter((player) => player.assignedFranchiseCode).length,
    [players],
  );

  const leagueTeams = useMemo(
    () =>
      FRANCHISES.map((franchiseInfo) => {
        const row = teams.find((entry) => entry.franchise_code === franchiseInfo.code);
        const rosterCount =
          row?.roster_count ?? players.filter((player) => player.assignedFranchiseCode === franchiseInfo.code).length;

        return {
          code: franchiseInfo.code,
          name: row?.name ?? franchiseInfo.name,
          city: row?.city ?? franchiseInfo.city,
          purseLakhs: row?.purse_lakhs ?? 1000,
          spentLakhs: row?.spent_lakhs ?? 0,
          rosterCount,
        };
      }),
    [players, teams],
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
  const currentBidLakhs = auctionState?.current_bid ?? currentPlayer?.currentBidLakhs ?? 0;
  const currentPlayerPriceLakhs = currentBidLakhs || currentPlayer?.basePriceLakhs || 0;
  const leadingFranchise = auctionState?.current_winning_franchise_code
    ? FRANCHISE_BY_CODE[auctionState.current_winning_franchise_code as FranchiseCode] ?? null
    : null;
  const activeViewDetails = VIEW_DETAILS[viewMode];
  const activeViewCount = viewMode === "market" ? marketPlayers.length : viewMode === "strategy" ? `${strategyPlayers.length}/2` : squadPlayers.length;
  const currentLotLabel = currentPlayer?.slNo != null ? `Lot #${currentPlayer.slNo}` : "Live lot";

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

  const renderPlayerCard = (player: Player, options?: { isSelected?: boolean; isStrategy?: boolean; strategyIndex?: number }) => {
    const isSelected = options?.isSelected ?? false;
    const strategyIndex = options?.strategyIndex;
    const isLivePlayer = player.id === currentPlayer?.id;
    const cardClassName = [
      "franchise-player-card",
      isLivePlayer ? "is-live" : "",
      isSelected ? (strategyIndex === 0 ? "is-selected-primary" : "is-selected-secondary") : "",
      options?.isStrategy ? "is-clickable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const cardContent = (
      <>
        <div className="franchise-player-top">
          <div>
            <p className="franchise-player-lot">
              {player.slNo !== null ? `Lot #${player.slNo}` : "Live lot"}
            </p>
            <h3>{player.name}</h3>
            <p className="franchise-player-role">{player.role}</p>
          </div>
          <span>{player.assignedFranchiseCode ?? "Pool"}</span>
        </div>

        <div className="franchise-player-meta">
          <span>{formatCr(player.basePriceLakhs)}</span>
          <span>CP {player.creditPoints || "--"}</span>
          <span>{player.country}</span>
          <span>{player.status}</span>
        </div>

        {options?.isStrategy ? (
          <p className="strategy-card-note">
            {isSelected ? (strategyIndex === 0 ? "Primary pick" : "Secondary pick") : "Tap to shortlist"}
          </p>
        ) : null}
      </>
    );

    if (options?.isStrategy) {
      return (
        <button
          key={player.id}
          type="button"
          onClick={() => toggleStrategyPlayer(player.id)}
          className={cardClassName}
        >
          {cardContent}
        </button>
      );
    }

    return (
      <article key={player.id} className={cardClassName}>
        {cardContent}
      </article>
    );
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
    return <FranchiseDashboardLoading title={`Loading ${franchise.name}`} subtitle="Fetching live squad and market data from Supabase." />;
  }

  return (
    <main className="dashboard-shell franchise-dashboard-shell arena-dashboard-shell">
      <header className="franchise-arena-header">
        <div className="franchise-arena-topline">
          <span className="arena-brand-pill">IPL Auction Arena</span>
          <span className="arena-live-pill">Up For Auction</span>
          <nav className="arena-nav" aria-label="Franchise dashboard views">
            {(["squad", "market", "strategy"] as ViewMode[]).map((nextView) => (
              <button
                key={nextView}
                type="button"
                className={viewMode === nextView ? "active" : ""}
                onClick={() => setViewMode(nextView)}
              >
                {VIEW_LABELS[nextView]}
              </button>
            ))}
          </nav>
        </div>

        <div className="franchise-arena-title-row">
          <div className="franchise-title-block">
            <p>Franchise Room</p>
            <h1>{franchise.name}</h1>
          </div>
          <div className="arena-team-actions">
            <span>{franchise.code} War Room</span>
            <Link href="/franchise/login">Switch Team</Link>
            <Link
              href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
              className="arena-primary-link is-compact"
            >
              Enter Live Auction
            </Link>
          </div>
        </div>
      </header>

      {errorMessage ? <section className="arena-alert">{errorMessage}</section> : null}

      <section className="franchise-arena-grid">
        <section className="arena-panel franchise-roster-panel" aria-label={`${franchise.name} dashboard`}>
          <div className="franchise-command-block">
            <div className="franchise-crest" aria-hidden="true">
              {franchise.code}
            </div>
            <div>
              <p>{franchise.city}</p>
              <h2>{franchise.code}</h2>
              <span>
                {teamCount} of 25 players signed
              </span>
            </div>
            <aside className="next-player-chip">
              <span>Next lot</span>
              <strong>{currentPlayer?.name ?? "Waiting"}</strong>
              <em>{currentPlayer ? currentLotLabel : "Auction idle"}</em>
            </aside>
          </div>

          <div className="franchise-purse-strip">
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

          <div className="arena-section-heading">
            <div>
              <p>{activeViewDetails.eyebrow}</p>
              <h2>{activeViewDetails.title}</h2>
            </div>
            <span>{activeViewCount}</span>
          </div>

          {viewMode === "strategy" ? (
            <div className="strategy-pick-strip">
              {strategyPlayers.map((player, index) => (
                <span key={player.id} className={index === 0 ? "primary" : "secondary"}>
                  {player.name}
                </span>
              ))}
              {!strategyPlayers.length ? <span>Select up to two players from your squad.</span> : null}
            </div>
          ) : null}

          <section className="franchise-player-list" aria-label={activeViewDetails.title}>
            {viewMode === "squad"
              ? squadPlayers.length
                ? squadPlayers.map((player) => renderPlayerCard(player))
                : <article className="arena-empty-state">{activeViewDetails.empty}</article>
              : null}

            {viewMode === "market"
              ? marketPlayers.length
                ? marketPlayers.map((player) => renderPlayerCard(player))
                : <article className="arena-empty-state">{activeViewDetails.empty}</article>
              : null}

            {viewMode === "strategy"
              ? squadPlayers.length
                ? squadPlayers.map((player) => {
                    const strategyIndex = selectedStrategyIds.indexOf(player.id);
                    return renderPlayerCard(player, {
                      isSelected: strategyIndex !== -1,
                      isStrategy: true,
                      strategyIndex: strategyIndex === -1 ? undefined : strategyIndex,
                    });
                  })
                : <article className="arena-empty-state">{activeViewDetails.empty}</article>
              : null}
          </section>
        </section>

        <section className="arena-panel auction-intel-panel" aria-label="Live auction stats">
          <div className="arena-title-rule">
            <span />
            <p>Player Stats</p>
            <span />
          </div>

          <div className="arena-stat-stack">
            <article>
              <span>Total Players</span>
              <strong>{players.length}</strong>
            </article>
            <article>
              <span>Sold</span>
              <strong>{soldPlayersCount}</strong>
            </article>
            <article>
              <span>Remaining</span>
              <strong>{marketPlayers.length}</strong>
            </article>
            <article>
              <span>Total Spent</span>
              <strong>{formatCr(teamSpent)}</strong>
            </article>
            <article>
              <span>Base Price</span>
              <strong>{formatCr(currentPlayer?.basePriceLakhs ?? 0)}</strong>
            </article>
          </div>

          <article className="current-player-feature">
            <p>Current Player</p>
            <strong>{formatCr(currentPlayerPriceLakhs)}</strong>
            <span>{currentPlayer?.name ?? "Waiting for auction"}</span>
          </article>

          <div className="auction-state-grid">
            <article>
              <span>Status</span>
              <strong>{auctionState?.status ?? "idle"}</strong>
            </article>
            <article>
              <span>Leading</span>
              <strong>{leadingFranchise?.code ?? auctionState?.current_winning_franchise_code ?? "None"}</strong>
            </article>
          </div>

          <p className="auction-intel-note">
            {currentPlayer ? `${currentLotLabel} / ${currentPlayer.role} / ${currentPlayer.country}` : "Live state will update when the auctioneer advances the lot."}
          </p>
        </section>

        <aside className="arena-panel league-teams-panel" aria-label="All teams">
          <div className="arena-section-heading">
            <div>
              <p>League ledger</p>
              <h2>All Teams</h2>
            </div>
            <span>Sold {soldPlayersCount}</span>
          </div>

          <div className="league-team-list">
            {leagueTeams.map((leagueTeam) => (
              <article
                key={leagueTeam.code}
                className={leagueTeam.code === franchise.code ? "active" : ""}
              >
                <div>
                  <strong>{leagueTeam.code}</strong>
                  <span>{leagueTeam.rosterCount} players</span>
                </div>
                <p>{leagueTeam.spentLakhs ? formatCr(leagueTeam.spentLakhs) : "--"}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function FranchiseDashboardPage() {
  return (
    <Suspense
      fallback={<FranchiseDashboardLoading subtitle="Preparing live team data." />}
    >
      <FranchiseDashboardContent />
    </Suspense>
  );
}
