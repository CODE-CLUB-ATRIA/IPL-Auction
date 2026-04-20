'use client';

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlayerCard from "@/components/PlayerCard";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import { mapAuctionStateRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import { mapPlayersForAuctionRound } from "@/services/supabase";
import type { AuctionStateRow, AuctionStatus, Player, PlayerRow } from "@/types/player";

/* ── Enhanced team colour map with darker, modern palette ───────────────── */
const TEAM_THEMES: Record<string, {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  surface: string;
  text: string;
  gradient: string;
  darkBg: string;
}> = {
  CSK: {
    primary: "#ffc107",
    secondary: "#ff6f00",
    accent: "#ffd54f",
    glow: "rgba(255, 193, 7, 0.4)",
    surface: "rgba(255, 193, 7, 0.08)",
    text: "#ffe082",
    gradient: "linear-gradient(135deg, #1a1500 0%, #0d0a00 100%)",
    darkBg: "#0f0c00"
  },
  MI: {
    primary: "#00e5ff",
    secondary: "#0091ea",
    accent: "#80d8ff",
    glow: "rgba(0, 229, 255, 0.4)",
    surface: "rgba(0, 145, 234, 0.08)",
    text: "#4fc3f7",
    gradient: "linear-gradient(135deg, #00151a 0%, #000a0d 100%)",
    darkBg: "#000d12"
  },
  RCB: {
    primary: "#ff1744",
    secondary: "#d50000",
    accent: "#ff5252",
    glow: "rgba(255, 23, 68, 0.4)",
    surface: "rgba(213, 0, 0, 0.08)",
    text: "#ff8a80",
    gradient: "linear-gradient(135deg, #1a0005 0%, #0d0002 100%)",
    darkBg: "#140005"
  },
  KKR: {
    primary: "#7c4dff",
    secondary: "#3d5afe",
    accent: "#b388ff",
    glow: "rgba(124, 77, 255, 0.4)",
    surface: "rgba(61, 90, 254, 0.08)",
    text: "#9575cd",
    gradient: "linear-gradient(135deg, #0a0014 0%, #05000a 100%)",
    darkBg: "#0a0514"
  },
  SRH: {
    primary: "#ff9100",
    secondary: "#ff6d00",
    accent: "#ffd180",
    glow: "rgba(255, 145, 0, 0.4)",
    surface: "rgba(255, 109, 0, 0.08)",
    text: "#ffab40",
    gradient: "linear-gradient(135deg, #1a0d00 0%, #0d0600 100%)",
    darkBg: "#120900"
  },
  RR: {
    primary: "#ff4081",
    secondary: "#f50057",
    accent: "#ff80ab",
    glow: "rgba(255, 64, 129, 0.4)",
    surface: "rgba(245, 0, 87, 0.08)",
    text: "#ff6090",
    gradient: "linear-gradient(135deg, #1a0008 0%, #0d0004 100%)",
    darkBg: "#120008"
  },
  PBKS: {
    primary: "#ff3d00",
    secondary: "#dd2c00",
    accent: "#ff6e40",
    glow: "rgba(255, 61, 0, 0.4)",
    surface: "rgba(221, 44, 0, 0.08)",
    text: "#ff9e80",
    gradient: "linear-gradient(135deg, #1a0500 0%, #0d0200 100%)",
    darkBg: "#120800"
  },
  DC: {
    primary: "#536dfe",
    secondary: "#3d5afe",
    accent: "#8c9eff",
    glow: "rgba(83, 109, 254, 0.4)",
    surface: "rgba(61, 90, 254, 0.08)",
    text: "#a1b3ff",
    gradient: "linear-gradient(135deg, #00051a 0%, #00020d 100%)",
    darkBg: "#050a1a"
  },
  LSG: {
    primary: "#00b0ff",
    secondary: "#0091ea",
    accent: "#80d8ff",
    glow: "rgba(0, 176, 255, 0.4)",
    surface: "rgba(0, 145, 234, 0.08)",
    text: "#4fc3f7",
    gradient: "linear-gradient(135deg, #00101a 0%, #00080d 100%)",
    darkBg: "#000d14"
  },
  GT: {
    primary: "#00bfa5",
    secondary: "#00b8d4",
    accent: "#64ffda",
    glow: "rgba(0, 191, 165, 0.4)",
    surface: "rgba(0, 184, 212, 0.08)",
    text: "#4dd0e1",
    gradient: "linear-gradient(135deg, #001a16 0%, #000d0c 100%)",
    darkBg: "#001412"
  },
};

const getTeamTheme = (code: string) => TEAM_THEMES[code] ?? TEAM_THEMES.CSK;
import { mapPlayersForAuctionRound } from "@/services/supabase";
import type { AuctionStateRow, AuctionStatus, Player, PlayerRow } from "@/types/player";

type TeamRow = {
  franchise_code: string;
  name: string;
  city: string;
  purse_lakhs: number;
  spent_lakhs: number;
  roster_count: number;
  is_blocked: boolean;
  round3_qualified?: boolean;
};

const TEAM_SIZE_CAP = 11;
const TEAM_PURSE_CAP_LAKHS = 10000; // 100 Cr
const BID_INCREMENT_LAKHS = 50;

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the live auction feed.";
};

const formatCr = (amountInLakhs: number): string => {
  if (amountInLakhs >= 100) {
    return `₹${(amountInLakhs / 100).toFixed(amountInLakhs % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `₹${amountInLakhs} L`;
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

type WinAnnouncement = {
  playerId: string;
  playerName: string;
  amountLakhs: number;
  imageUrl: string;
};

type RoundTransitionModal = {
  qualified: boolean;
};

/* ══════════════════════════════════════════════════════════════════
   CLEAN CURTAIN ANIMATION COMPONENT - LOGO ON TOP
   ══════════════════════════════════════════════════════════════════ */
function CurtainReveal({
  franchiseCode,
  franchiseName,
  currentPlayer,
  onComplete
}: {
  franchiseCode: string;
  franchiseName: string;
  currentPlayer: Player | null;
  onComplete: () => void;
}) {
  const theme = getTeamTheme(franchiseCode);
  const [phase, setPhase] = useState<"hold" | "open" | "done">("hold");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("open"), 2200);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 3500);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className="curtain-overlay"
      style={{
        "--team-primary": theme.primary,
        "--team-secondary": theme.secondary,
        "--team-glow": theme.glow,
        "--team-surface": theme.surface,
        "--team-text": theme.text,
      } as React.CSSProperties}
    >
      {/* Background with player - Layer 1 */}
      <div className="curtain-background">
        <div className="curtain-bg-gradient" />
        {currentPlayer?.id && (
          <div className="curtain-player-bg">
            <img
              src={`/players/${currentPlayer.id}.png`}
              alt=""
              className="curtain-player-bg__img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="curtain-player-bg__overlay" />
          </div>
        )}
      </div>

      {/* Curtains - Layer 2 */}
      <div className="curtain-container">
        <div className={`curtain-panel curtain-left ${phase === "open" ? "curtain-panel--open" : ""}`}>
          <div className="curtain-panel__fabric" />
        </div>
        <div className={`curtain-panel curtain-right ${phase === "open" ? "curtain-panel--open" : ""}`}>
          <div className="curtain-panel__fabric" />
        </div>
      </div>

      {/* Logo & Content - Layer 3 (On top of curtains) */}
      <div className={`curtain-content ${phase === "open" ? "curtain-content--fade" : ""}`}>
        <div className="curtain-brand">
          <div className="curtain-logo">
            <img src={`/teams/${franchiseCode}.png`} alt={franchiseName} />
          </div>

          <div className="curtain-text">
            <span className="curtain-text__subtitle">Entering the Arena</span>
            <h1 className="curtain-text__title">{franchiseName}</h1>
          </div>
        </div>

        <div className="curtain-sparks">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="curtain-spark"
              style={{
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                background: i % 2 === 0 ? theme.primary : theme.secondary,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BID LOG PANEL - Right side component
   ══════════════════════════════════════════════════════════════════ */
function BidLogPanel({ bidFeed, teamTheme }: { bidFeed: string[]; teamTheme: ReturnType<typeof getTeamTheme> }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new bids come in
  useEffect(() => {
    if (scrollRef.current && bidFeed.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [bidFeed]);

  return (
    <section
      className="la-glass-card la-bid-log"
      style={{
        "--team-primary": teamTheme.primary,
        "--team-glow": teamTheme.glow,
        "--team-text": teamTheme.text,
      } as React.CSSProperties}
    >
      <div className="la-bid-log__header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4l3 3"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <h2>Live Bid History</h2>
        {bidFeed.length > 0 && (
          <span className="la-bid-log__count">{bidFeed.length}</span>
        )}
      </div>

      <div className="la-bid-log__list" ref={scrollRef}>
        {bidFeed.length ? (
          bidFeed.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="la-bid-log__item"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="la-bid-log__dot" />
              <p className="la-bid-log__text">{item}</p>
            </div>
          ))
        ) : (
          <div className="la-bid-log__empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p>No bids yet</p>
            <span>Waiting for the auction to begin...</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LATEST BID TOAST - Top left notification
   ══════════════════════════════════════════════════════════════════ */
function LatestBidToast({ bidFeed, teamTheme }: { bidFeed: string[]; teamTheme: ReturnType<typeof getTeamTheme> }) {
  const [show, setShow] = useState(false);
  const [latestBid, setLatestBid] = useState("");
  const prevLengthRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if a new bid was added
    if (bidFeed.length > prevLengthRef.current && bidFeed.length > 0) {
      const newBid = bidFeed[0];
      setLatestBid(newBid);
      setShow(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Auto dismiss after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setShow(false);
      }, 2000);
    }

    prevLengthRef.current = bidFeed.length;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [bidFeed]);

  if (!show || !latestBid) return null;

  return (
    <div
      className={`latest-bid-toast ${show ? "latest-bid-toast--show" : ""}`}
      style={{
        "--team-primary": teamTheme.primary,
        "--team-secondary": teamTheme.secondary,
        "--team-glow": teamTheme.glow,
        "--team-text": teamTheme.text,
      } as React.CSSProperties}
    >
      <div className="latest-bid-toast__content">
        <div className="latest-bid-toast__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div className="latest-bid-toast__text">
          <span className="latest-bid-toast__label">New Bid</span>
          <p className="latest-bid-toast__message">{latestBid}</p>
        </div>
      </div>
      <div className="latest-bid-toast__progress">
        <div className="latest-bid-toast__progress-bar" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN AUCTION CONTENT - MODERN DARK UI
   ══════════════════════════════════════════════════════════════════ */
function FranchiseLiveAuctionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamCodeFromQuery = searchParams.get("team") as FranchiseCode | null;
  const franchise = teamCodeFromQuery ? FRANCHISE_BY_CODE[teamCodeFromQuery] : null;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [draftBidLakhs, setDraftBidLakhs] = useState(0);
  const [uiNotice, setUiNotice] = useState("");
  const [bidFeed, setBidFeed] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [winAnnouncement, setWinAnnouncement] = useState<WinAnnouncement | null>(null);
  
const [showCurtain, setShowCurtain] = useState(true);
const [roundTransitionModal, setRoundTransitionModal] = useState<RoundTransitionModal | null>(null);

  const previousAssignmentsRef = useRef<Map<string, string | null>>(new Map());
  const hasHydratedRef = useRef(false);
  const lastWinAnnouncementKeyRef = useRef("");
  const previousRoundRef = useRef<number | null>(null);

  const teamTheme = useMemo(() => getTeamTheme(franchise?.code ?? "CSK"), [franchise?.code]);

  const currentPlayer = useMemo(
    () => players.find((player) => player.id === auctionState?.current_player_id) ?? null,
    [auctionState?.current_player_id, players],
  );

  const teamRow = useMemo(
    () => teams.find((entry) => entry.franchise_code === franchise?.code) ?? null,
    [franchise?.code, teams],
  );

  const availablePlayers = useMemo(
    () => players.filter((player) => !player.assignedFranchiseCode),
    [players],
  );

  const baseBidLakhs = currentPlayer?.basePriceLakhs ?? 0;
  const liveBidLakhs = auctionState?.current_bid ?? 0;
  const minimumNextBidLakhs = useMemo(() => {
    return Math.max(baseBidLakhs, liveBidLakhs + BID_INCREMENT_LAKHS);
  }, [baseBidLakhs, liveBidLakhs]);

  const auctionRound = auctionState?.auction_round ?? 2;
  const isRoundThree = auctionRound === 3;
  const isRoundThreeQualified = Boolean(teamRow?.round3_qualified);
  const isAuctionStarted = auctionState?.status === "bidding";
  const isTeamFull = (teamRow?.roster_count ?? 0) >= TEAM_SIZE_CAP;
  const teamSpent = teamRow?.spent_lakhs ?? 0;
  const teamBudget = TEAM_PURSE_CAP_LAKHS;
  const teamRemainingPurse = Math.max(teamBudget - teamSpent, 0);
  const isFundsExhausted = teamRemainingPurse <= 0;
  const hasInsufficientFundsForNextBid = teamRemainingPurse < minimumNextBidLakhs;
  const teamRemainingDisplay = teamRemainingPurse;

  const bidBlockReason = useMemo(() => {
    if (!currentPlayer) return "Cannot place a bid because there is no active player.";
    if (!isAuctionStarted) return "Bidding has not started yet. Waiting for auctioneer.";
    if (isRoundThree && !isRoundThreeQualified) return "Your franchise did not qualify for Round 3 bidding.";
    if (teamRow?.is_blocked) return "Your franchise is currently blocked from bidding.";
    if (isTeamFull) return `Squad full. Maximum ${TEAM_SIZE_CAP} players allowed.`;
    if (isFundsExhausted) return "You have exhausted your funds. Go back and manage your team.";
    if (hasInsufficientFundsForNextBid) return "Insufficient purse for the next valid bid.";
    return "";
  }, [currentPlayer, hasInsufficientFundsForNextBid, isAuctionStarted, isFundsExhausted, isRoundThree, isRoundThreeQualified, isTeamFull, teamRow?.is_blocked]);

  const isBidActionDisabled = isSubmittingBid || Boolean(bidBlockReason);

  const cardPlayer = useMemo(() => {
    if (!currentPlayer) return null;
    return {
      ...currentPlayer,
      currentBidLakhs: liveBidLakhs,
      status: auctionState?.status ?? currentPlayer.status,
    };
  }, [auctionState?.status, currentPlayer, liveBidLakhs]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [{ data: playersData, error: playersError }, { data: teamsData, error: teamsError }, { data: stateData, error: stateError }] =
          await Promise.all([
            supabase.from("players").select("*").order("sl_no", { ascending: true }),
            supabase.from("teams").select("*").order("franchise_code", { ascending: true }),
            supabase.from("auction_state").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);

        if (playersError) throw playersError;
        if (teamsError) throw teamsError;
        if (stateError) throw stateError;

        const nextTeams = (teamsData ?? []) as TeamRow[];
        const nextAuctionState = stateData ? mapAuctionStateRow(stateData as Record<string, unknown>) : null;
        const nextPlayers = mapPlayersForAuctionRound(
          (playersData ?? []) as PlayerRow[],
          nextAuctionState?.auction_round ?? 2,
        );

        if (!isMounted) return;

        if (hasHydratedRef.current && franchise) {
          const wonPlayer = nextPlayers.find((player) => {
            const previousAssignment = previousAssignmentsRef.current.get(player.id) ?? null;
            return player.assignedFranchiseCode === franchise.code && previousAssignment !== franchise.code;
          });

          if (wonPlayer && lastWinAnnouncementKeyRef.current !== wonPlayer.id) {
            lastWinAnnouncementKeyRef.current = wonPlayer.id;
            setWinAnnouncement({
              playerId: wonPlayer.id,
              playerName: wonPlayer.name
              amountLakhs:
                wonPlayer.currentBidLakhs || nextAuctionState?.current_winning_bid_lakhs || nextAuctionState?.current_bid || 0,
              imageUrl: wonPlayer.imageUrl,
            });
          }
        }

        setPlayers(nextPlayers);
        setTeams(nextTeams);
        setAuctionState(nextAuctionState);
        setErrorMessage("");

        previousAssignmentsRef.current = new Map(nextPlayers.map((player) => [player.id, player.assignedFranchiseCode]));
        hasHydratedRef.current = true;
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPlayers([]);
          setTeams([]);
          setAuctionState(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    // Poll every 1 second to keep auction live
    const intervalId = setInterval(() => {
      void loadData();
    }, 1000);

    const channel = supabase
      .channel("franchise_live_auction")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void loadData())
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setDraftBidLakhs(minimumNextBidLakhs);
  }, [minimumNextBidLakhs, auctionState?.current_player_id]);

  useEffect(() => {
    if (!franchise || !auctionState?.current_player_id || !currentPlayer) return;
    if (auctionState.status !== "bidding" || auctionState.current_bid <= 0) return;

    const feedItem = `${franchise.code === auctionState.current_winning_franchise_code ? "You" : auctionState.current_winning_franchise_code ?? "Unknown"} bid ${formatCr(auctionState.current_bid)} for ${currentPlayer.name}`;
    setBidFeed((previous) => {
      if (previous[0] === feedItem) return previous;
      return [feedItem, ...previous].slice(0, 10);
    });
  }, [auctionState?.current_bid, auctionState?.current_player_id, auctionState?.current_winning_franchise_code, auctionState?.status, currentPlayer, franchise]);

  useEffect(() => {
    if (!winAnnouncement) return;
    const timeoutId = window.setTimeout(() => setWinAnnouncement(null), 9000);
    return () => window.clearTimeout(timeoutId);
  }, [winAnnouncement]);

  useEffect(() => {
    if (!franchise) {
      return;
    }

    if (previousRoundRef.current === null) {
      previousRoundRef.current = auctionRound;
      return;
    }

    const previousRound = previousRoundRef.current;

    if (previousRound !== auctionRound && auctionRound === 3) {
      // Only show modal if we haven't shown it for this round transition
      const modalShownKey = `round3_modal_shown_${franchise.code}`;
      const hasShownModal = sessionStorage.getItem(modalShownKey) === "true";

      if (!hasShownModal) {
        setRoundTransitionModal({ qualified: isRoundThreeQualified });
        sessionStorage.setItem(modalShownKey, "true");
      }
    }

    // Clear the session flag when transitioning back to round 2
    if (previousRound === 3 && auctionRound === 2) {
      const modalShownKey = `round3_modal_shown_${franchise.code}`;
      sessionStorage.removeItem(modalShownKey);
    }

    previousRoundRef.current = auctionRound;
  }, [auctionRound, franchise, isRoundThreeQualified]);

  const applyBidDelta = (deltaLakhs: number) => {
    setDraftBidLakhs((previous) => {
      const nextValue = previous + deltaLakhs;
      return Math.max(minimumNextBidLakhs, nextValue);
    });
  };

  const placeBid = async () => {
    if (!franchise || !auctionState?.id || !currentPlayer) {
      setErrorMessage("Cannot place a bid because there is no active player.");
      return;
    }
if (bidBlockReason) {
  setErrorMessage(bidBlockReason);
  return;
}
      return;
    }

    const nextBidLakhs = Math.max(draftBidLakhs, minimumNextBidLakhs);
    setIsSubmittingBid(true);
    setErrorMessage("");
    setUiNotice("");

    try {
      const response = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionStateId: auctionState.id,
          playerId: currentPlayer.id,
          franchiseCode: franchise.code,
          bidLakhs: nextBidLakhs,
        }),
      });

      const payload = await response.json() as { success?: boolean; message?: string; auctionState?: Record<string, unknown> };

      if (!response.ok || !payload.success || !payload.auctionState) {
        throw new Error(payload.message || "Unable to place bid right now.");
      }

      setAuctionState(mapAuctionStateRow(payload.auctionState));
      setUiNotice(`Bid placed: ${formatCr(nextBidLakhs)} on ${currentPlayer.name}`);
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleBidInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void placeBid();
    }
  };

  const handleCurtainComplete = useCallback(() => setShowCurtain(false), []);

  /* ── NO FRANCHISE ─────────────────────────────────── */
  if (!franchise) {
    return (
      <main className="la-dark-shell">
        <section className="la-glass-card" style={{ maxWidth: 480, margin: "auto", textAlign: "center", padding: "3rem 2rem" }}>
          <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: "2rem", color: "#fff" }}>Live Auction</h1>
          <p style={{ color: "#94a3b8", marginTop: "0.6rem" }}>Team is missing. Please login as a franchise first.</p>
          <Link href="/franchise/login" className="la-btn la-btn--primary" style={{ marginTop: "1.2rem", display: "inline-flex" }}>
            Go To Franchise Login
          </Link>
        </section>
      </main>
    );
  }

  /* ── LOADING ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <main className="la-dark-shell" style={{ "--team-primary": teamTheme.primary, "--team-glow": teamTheme.glow } as React.CSSProperties}>
        <div className="la-loading">
          <div className="la-loading__spinner" />
          <p>Connecting to live auction...</p>
        </div>
      </main>
    );
  }

  const purseRemaining = teamRow?.purse_lakhs ?? 1000;
  const purseSpent = teamRow?.spent_lakhs ?? 0;
  const pursePercent = purseRemaining > 0 ? Math.round((purseSpent / (purseRemaining + purseSpent)) * 100) : 0;

  /* ── MAIN RENDER ──────────────────────────────────── */
  return (
    <main
      className="la-dark-shell"
      style={{
        "--team-primary": teamTheme.primary,
        "--team-secondary": teamTheme.secondary,
        "--team-accent": teamTheme.accent,
        "--team-glow": teamTheme.glow,
        "--team-surface": teamTheme.surface,
        "--team-text": teamTheme.text,
        "--team-gradient": teamTheme.gradient,
        "--team-dark-bg": teamTheme.darkBg,
      } as React.CSSProperties}
    >
      {/* Enhanced Curtain with Player Background */}
      {showCurtain && (
        <CurtainReveal
          franchiseCode={franchise.code}
          franchiseName={franchise.name}
          currentPlayer={currentPlayer}
          onComplete={handleCurtainComplete}
        />
      )}

      {/* Ambient background effects */}
      <div className="la-ambient-glow" />
      <div className="la-noise-overlay" />
      <div className="la-grid-overlay" />

      {/* Latest Bid Toast - Top left notification */}
      <LatestBidToast bidFeed={bidFeed} teamTheme={teamTheme} />

      {/* ── TOPBAR ────────────────────────────────────── */}
      <header className="la-topbar">
        <div className="la-topbar__brand">
          <div className="la-topbar__logo-ring">
            <img src={`/teams/${franchise.code}.png`} alt={franchise.name} />
          </div>
          <div>
            <span className="la-topbar__title">Cricket Auction Arena</span>
            <span className="la-topbar__team">{franchise.name}</span>
          </div>
        </div>

        <div className="la-topbar__status">
          <span className={`la-status-dot ${auctionState?.status === "bidding" ? "la-status-dot--live" : ""}`} />
          <span className="la-topbar__status-text">
            {auctionState?.status === "bidding" ? "LIVE" : (auctionState?.status ?? "IDLE").toUpperCase()}
          </span>
        </div>

        <div className="la-topbar__actions">
          <Link href={`/franchise/dashboard?team=${franchise.code}`} className="la-btn la-btn--ghost">
            Dashboard
          </Link>
          <Link href="/" className="la-btn la-btn--ghost">
            Exit
          </Link>
        </div>
      </header>

      {/* ── NOTICES ───────────────────────────────────── */}
      {/* ── MAIN GRID ────────────────────────────────── */}
      <section className="la-grid">
        {/* ── LEFT: Player spotlight ──────────────────── */}
        <article className="la-glass-card la-player-spotlight">
          {cardPlayer ? (
            <div className="la-player-spotlight__inner">
              <PlayerCard player={cardPlayer} className="h-full" />
            </div>
          ) : (
            <div className="la-waiting">
              <div className="la-waiting__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" opacity="0.3"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h2>Waiting For Auctioneer</h2>
              <p>No active lot</p>
            </div>
          )}
        </article>

        {/* ── RIGHT: Control panel with Bid Log ───────────────────── */}
        <aside className="la-controls">
          {/* Bidding Panel */}
          <section className="la-glass-card la-bid-panel">
            <div className="la-bid-panel__header">
              <h2>Live Bidding Panel</h2>
              <span className="la-bid-panel__lot">{currentPlayer?.name ?? "—"}</span>
            </div>

              <div className="rounded-[0.9rem] border-[3px] border-[#111111] bg-[#f8f8f8] p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#666]">Your next bid</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.2fr_1fr]">
                  <button
                    type="button"
                    className="ghost-button h-10 min-h-0"
                    onClick={() => applyBidDelta(-BID_INCREMENT_LAKHS)}
                    disabled={isBidActionDisabled}
                  >
                    -50 L
                  </button>
                  <input
                    type="number"
                    min={minimumNextBidLakhs}
                    step={BID_INCREMENT_LAKHS}
                    value={draftBidLakhs}
                    onChange={(event) => setDraftBidLakhs(Math.max(minimumNextBidLakhs, Number(event.target.value) || minimumNextBidLakhs))}
                    onKeyDown={handleBidInputKeyDown}
                    className="h-10 w-full rounded-[0.7rem] border-[3px] border-[#111111] bg-white px-2 text-center text-base font-black"
                    disabled={isBidActionDisabled}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="ghost-button h-10 min-h-0"
                      onClick={() => applyBidDelta(BID_INCREMENT_LAKHS)}
                      disabled={isBidActionDisabled}
                    >
                      +50 L
                    </button>
                    <button
                      type="button"
                      className="ghost-button h-10 min-h-0"
                      onClick={() => applyBidDelta(100)}
                      disabled={isBidActionDisabled}
                    >
                      +1 Cr
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#666]">Minimum next bid: {formatCr(minimumNextBidLakhs)} • Press Enter to place</p>
                {bidBlockReason ? (
                  <p className="mt-2 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-rose-700">
                    {bidBlockReason}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                className="primary-button w-full"
                onClick={() => void placeBid()}
                disabled={isBidActionDisabled}
              >
                {isSubmittingBid ? "Placing Bid..." : `Place Bid ${formatCr(draftBidLakhs)}`}
              </button>
            </div>

            <div className="la-bid-panel__input-area">
              <p className="la-label">Your next bid</p>
              <div className="la-bid-row">
                <button type="button" className="la-btn la-btn--ghost la-btn--sm" onClick={() => applyBidDelta(-5)} disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}>−5L</button>
                <input
                  type="number"
                  min={minimumNextBidLakhs}
                  step={5}
                  value={draftBidLakhs}
                  onChange={(event) => setDraftBidLakhs(Math.max(minimumNextBidLakhs, Number(event.target.value) || minimumNextBidLakhs))}
                  onKeyDown={handleBidInputKeyDown}
                  className="la-bid-input"
                  disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
                />
                <button type="button" className="la-btn la-btn--ghost la-btn--sm" onClick={() => applyBidDelta(5)} disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}>+5L</button>
                <button type="button" className="la-btn la-btn--ghost la-btn--sm" onClick={() => applyBidDelta(10)} disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}>+10L</button>
              </div>
              <p className="la-helper-text">Min: {formatCr(minimumNextBidLakhs)} · Press Enter</p>

          <section className="dashboard-card max-w-none p-4 text-left">
            <h2 className="font-display text-xl">Squad Snapshot</h2>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Players</p>
                <strong>{teamRow?.roster_count ?? 0}</strong>
              </article>
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Spent</p>
                <strong>{formatCr(teamRow?.spent_lakhs ?? 0)}</strong>
              </article>
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Remaining</p>
                <strong>{formatCr(teamRemainingDisplay)}</strong>
              </article>

            </div>

            <button
              type="button"
              className="la-btn la-btn--primary la-btn--large la-btn--glow"
              onClick={() => void placeBid()}
              disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
            >
              {isSubmittingBid ? <span className="la-btn__spinner" /> : null}
              {isSubmittingBid ? "Placing..." : `Place Bid ${formatCr(draftBidLakhs)}`}
            </button>
          </section>

          {/* Squad Snapshot */}
          <section className="la-glass-card la-squad-snapshot">
            <h2>Squad Snapshot</h2>
            <div className="la-squad-stats">
              <div className="la-stat-mini">
                <span className="la-stat-mini__value">{teamRow?.roster_count ?? 0}</span>
                <span className="la-stat-mini__label">Players</span>
              </div>
              <div className="la-stat-mini">
                <span className="la-stat-mini__value">{formatCr(purseSpent)}</span>
                <span className="la-stat-mini__label">Spent</span>
              </div>
              <div className="la-stat-mini">
                <span className="la-stat-mini__value">{formatCr(purseRemaining)}</span>
                <span className="la-stat-mini__label">Remaining</span>
              </div>
            </div>
            <div className="la-purse-bar">
              <div className="la-purse-bar__fill" style={{ width: `${pursePercent}%` }} />
            </div>
          </section>

          {/* Available Market */}
          <section className="la-glass-card la-market-preview">
            <h2>Available Market</h2>
            <div className="la-market-list">
              {availablePlayers.slice(0, 12).map((player) => (
                <div key={player.id} className="la-market-item">
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.role}</span>
                  </div>
                  <span className="la-market-item__price">{formatCr(player.basePriceLakhs)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Bid History - At the bottom of right panel */}
          <BidLogPanel bidFeed={bidFeed} teamTheme={teamTheme} />
        </aside>
      </section>

      {/* Bid Log now moved to right side panel */}

      {/* ── WIN ANNOUNCEMENT ─────────────────────────── */}
      {winAnnouncement ? (
        <div className="la-win-overlay" role="dialog" aria-modal="true">
          <section className="la-win-modal">
            <div className="la-win-confetti">
              {Array.from({ length: 30 }).map((_, i) => (
                <span key={i} className="la-confetti-piece" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.2}s`,
                  background: i % 3 === 0 ? teamTheme.primary : i % 3 === 1 ? teamTheme.secondary : teamTheme.accent,
                }} />
              ))}
            </div>
            <p className="la-win-kicker">Congratulations</p>
            <h2>You won the bid for<br /><span style={{ color: teamTheme.primary }}>{winAnnouncement.playerName}</span></h2>
            <p className="la-win-amount">
              Final bid: <strong>{formatCr(winAnnouncement.amountLakhs)}</strong>
            </p>
            <p className="la-win-info">This player has been added to your squad.</p>
            <div className="la-win-actions">
              <Link href={`/franchise/dashboard?team=${encodeURIComponent(franchise.code)}`} className="la-btn la-btn--primary">
                View Squad
              </Link>
              <button type="button" className="la-btn la-btn--ghost" onClick={() => setWinAnnouncement(null)}>
                Continue Bidding
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {roundTransitionModal ? (
        <div className="franchise-win-overlay" role="dialog" aria-modal="true" aria-labelledby="round-transition-title">
          <section className="franchise-win-modal">
            <p className="franchise-win-kicker">Round Update</p>
            <h2 id="round-transition-title">
              {roundTransitionModal.qualified ? "Congratulations, you are up to the next round" : "Round 3 has started"}
            </h2>
            {roundTransitionModal.qualified ? (
              <>
                <p>Your strategy players are kept back in your team.</p>
                <p>You have to start the bidding for the remaining players. Continue to your squad board to see those retained strategy players while all other previous players are removed.</p>
              </>
            ) : (
              <p>Only top 5 teams proceed to Round 3. Your team is not qualified for Round 3 bidding.</p>
            )}
            <div className="franchise-win-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setRoundTransitionModal(null);
                  router.push(`/franchise/dashboard?team=${encodeURIComponent(franchise.code)}`);
                }}
              >
                Go To Squad
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setRoundTransitionModal(null)}
              >
                Stay Here
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function FranchiseLiveAuctionPage() {
  return (
    <Suspense
      fallback={
        <main className="la-dark-shell">
          <div className="la-loading">
            <div className="la-loading__spinner" />
            <p>Connecting to live bidding feed...</p>
          </div>
        </main>
      }
    >
      <FranchiseLiveAuctionContent />
    </Suspense>
  );
}
