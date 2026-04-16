"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";

/* ---- Animated dot-grid wave background (canvas) ---- */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function DotWaveBackground({ color = "#00c8b9" }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const { r, g, b } = hexToRgb(color);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    const DOT_GAP = 22;
    const BASE_R = 1.8;
    const WAVE_R = 5.5;
    const WAVE_WIDTH = 180;
    const SPEED = 0.35;

    // Offscreen canvas for static dots (drawn once)
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d")!;

    // Pre-computed per-dot diagonal projections
    let projections: Float32Array;
    let dotXs: Float32Array;
    let dotYs: Float32Array;
    let totalDots = 0;
    let diag = 0;

    function buildStatic() {
      const W = canvas!.width;
      const H = canvas!.height;
      offscreen.width = W;
      offscreen.height = H;
      diag = Math.sqrt(W * W + H * H);

      const cols = Math.ceil(W / DOT_GAP) + 1;
      const rows = Math.ceil(H / DOT_GAP) + 1;
      totalDots = cols * rows;

      projections = new Float32Array(totalDots);
      dotXs = new Float32Array(totalDots);
      dotYs = new Float32Array(totalDots);

      // Pre-compute positions & projections, draw base dots
      offCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
      let idx = 0;
      for (let row = 0; row < rows; row++) {
        for (let c = 0; c < cols; c++) {
          const x = c * DOT_GAP;
          const y = row * DOT_GAP;
          dotXs[idx] = x;
          dotYs[idx] = y;
          projections[idx] = (x / W + y / H) * 0.5 * diag;

          offCtx.beginPath();
          offCtx.arc(x, y, BASE_R, 0, Math.PI * 2);
          offCtx.fill();
          idx++;
        }
      }
    }

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      buildStatic();
    }
    resize();
    window.addEventListener("resize", resize);

    let waveOffset = -WAVE_WIDTH;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;

      // Stamp static dots in one call
      ctx!.clearRect(0, 0, W, H);
      ctx!.drawImage(offscreen, 0, 0);

      // Only overdraw dots near the wave band
      for (let i = 0; i < totalDots; i++) {
        const dist = Math.abs(projections[i] - waveOffset);
        if (dist >= WAVE_WIDTH) continue;

        const t = 1 - dist / WAVE_WIDTH;
        const ease = t * t * (3 - 2 * t);
        const radius = BASE_R + (WAVE_R - BASE_R) * ease;
        const alpha = 0.22 + 0.45 * ease;

        // Clear the base dot and draw enlarged one
        const x = dotXs[i];
        const y = dotYs[i];
        ctx!.clearRect(x - WAVE_R - 1, y - WAVE_R - 1, WAVE_R * 2 + 2, WAVE_R * 2 + 2);
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fill();
      }

      waveOffset += SPEED;
      if (waveOffset > diag + WAVE_WIDTH) {
        waveOffset = -WAVE_WIDTH;
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";

type AuctionPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  basePriceCr: number;
  country: string;
  age: number;
  matches: number;
};

const AUCTION_PLAYERS: AuctionPlayer[] = [
  { id: "P-101", name: "Arjun Nair", role: "Batsman", basePriceCr: 0.2, country: "IND", age: 26, matches: 45 },
  { id: "P-102", name: "Vikram Patel", role: "Bowler", basePriceCr: 0.2, country: "IND", age: 24, matches: 32 },
  { id: "P-103", name: "Ritesh Menon", role: "All-Rounder", basePriceCr: 0.25, country: "IND", age: 28, matches: 67 },
  { id: "P-104", name: "Sahil Khan", role: "Wicket-Keeper", basePriceCr: 0.2, country: "IND", age: 23, matches: 18 },
  { id: "P-105", name: "Keshav Iyer", role: "Batsman", basePriceCr: 0.3, country: "IND", age: 30, matches: 89 },
  { id: "P-106", name: "Jay Soni", role: "Bowler", basePriceCr: 0.25, country: "IND", age: 27, matches: 54 },
];

const BID_STEPS = [0.05, 0.1, 0.25];
const INITIAL_PURSE = 1;

const TEAM_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  CSK: { primary: "#ffc107", secondary: "#1a237e", glow: "rgba(255, 193, 7, 0.4)" },
  MI: { primary: "#004ba0", secondary: "#b0bec5", glow: "rgba(0, 75, 160, 0.4)" },
  RCB: { primary: "#d32f2f", secondary: "#1b1b1b", glow: "rgba(211, 47, 47, 0.4)" },
  KKR: { primary: "#6a1b9a", secondary: "#ffd54f", glow: "rgba(106, 27, 154, 0.4)" },
  SRH: { primary: "#ff6f00", secondary: "#1a1a1a", glow: "rgba(255, 111, 0, 0.4)" },
  RR: { primary: "#e91e9c", secondary: "#1a237e", glow: "rgba(233, 30, 156, 0.4)" },
  PBKS: { primary: "#d32f2f", secondary: "#fdd835", glow: "rgba(211, 47, 47, 0.4)" },
  DC: { primary: "#1565c0", secondary: "#d32f2f", glow: "rgba(21, 101, 192, 0.4)" },
  LSG: { primary: "#00bcd4", secondary: "#1a237e", glow: "rgba(0, 188, 212, 0.4)" },
  GT: { primary: "#1a237e", secondary: "#b0bec5", glow: "rgba(26, 35, 126, 0.4)" },
};

const ROLE_ICONS: Record<PlayerRole, string> = {
  Batsman: "🏏",
  Bowler: "⚾",
  "All-Rounder": "⭐",
  "Wicket-Keeper": "🧤",
};

function toCr(value: number) {
  return `₹${value.toFixed(2)} Cr`;
}

function toLakh(value: number) {
  if (value < 1) return `₹${(value * 100).toFixed(0)} Lakh`;
  return `₹${value.toFixed(2)} Cr`;
}

function nextIndex(currentIndex: number) {
  return (currentIndex + 1) % AUCTION_PLAYERS.length;
}

function CurtainReveal({
  primaryColor,
  teamCode,
  onComplete,
}: {
  primaryColor: string;
  teamCode: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"hold" | "opening" | "done">("hold");
  const sparkleCount = 24;

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("opening"), 1800);
    return () => clearTimeout(holdTimer);
  }, []);

  // Darken / lighten helpers for fabric folds
  const darken = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    const f = 1 - amount;
    return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
  };
  const lighten = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${Math.round(r + (255 - r) * amount)}, ${Math.round(g + (255 - g) * amount)}, ${Math.round(b + (255 - b) * amount)})`;
  };

  // Generate fabric fold gradient for realistic drape look
  const fabricGradient = `
    linear-gradient(90deg,
      ${darken(primaryColor, 0.35)} 0%,
      ${darken(primaryColor, 0.15)} 5%,
      ${lighten(primaryColor, 0.1)} 12%,
      ${darken(primaryColor, 0.2)} 20%,
      ${lighten(primaryColor, 0.15)} 28%,
      ${darken(primaryColor, 0.25)} 36%,
      ${lighten(primaryColor, 0.12)} 44%,
      ${darken(primaryColor, 0.18)} 52%,
      ${lighten(primaryColor, 0.2)} 60%,
      ${darken(primaryColor, 0.3)} 68%,
      ${lighten(primaryColor, 0.1)} 76%,
      ${darken(primaryColor, 0.22)} 84%,
      ${lighten(primaryColor, 0.05)} 92%,
      ${darken(primaryColor, 0.4)} 100%
    )
  `.trim();

  return (
    <div className="curtain-overlay">
      {/* Spotlight flash behind curtains */}
      <motion.div
        className="curtain-spotlight"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={phase === "opening" ? { opacity: [0, 1, 0.6, 0], scale: [0.5, 1.8, 2.5, 3] } : {}}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
      />

      {/* LEFT CURTAIN */}
      <motion.div
        className="curtain-panel curtain-left"
        style={{ background: fabricGradient }}
        initial={{ x: "0%" }}
        animate={phase === "opening" ? { x: "-105%" } : { x: "0%" }}
        transition={
          phase === "opening"
            ? { duration: 1.6, ease: [0.76, 0, 0.24, 1], delay: 0.15 }
            : {}
        }
      >
        {/* Fabric shimmer overlay */}
        <div className="curtain-shimmer" />
        {/* Bottom drape curve */}
        <div className="curtain-drape-bottom" style={{ background: darken(primaryColor, 0.4) }} />
      </motion.div>

      {/* RIGHT CURTAIN */}
      <motion.div
        className="curtain-panel curtain-right"
        style={{ background: fabricGradient }}
        initial={{ x: "0%" }}
        animate={phase === "opening" ? { x: "105%" } : { x: "0%" }}
        transition={
          phase === "opening"
            ? { duration: 1.6, ease: [0.76, 0, 0.24, 1], delay: 0.15 }
            : {}
        }
        onAnimationComplete={() => {
          if (phase === "opening") {
            setPhase("done");
            onComplete();
          }
        }}
      >
        <div className="curtain-shimmer" />
        <div className="curtain-drape-bottom" style={{ background: darken(primaryColor, 0.4) }} />
      </motion.div>

      {/* Golden center seam */}
      <motion.div
        className="curtain-center-seam"
        initial={{ opacity: 1 }}
        animate={phase === "opening" ? { opacity: 0, scaleX: 0 } : { opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="curtain-seam-line" />
        <div className="curtain-seam-ornament top" />
        <div className="curtain-seam-ornament bottom" />
      </motion.div>

      {/* Center badge — visible during hold phase */}
      <div className="curtain-center-wrapper">
        <motion.div
          className="curtain-center-badge"
          initial={{ scale: 0, opacity: 0, rotate: -15 }}
          animate={
            phase === "hold"
              ? { scale: 1, opacity: 1, rotate: 0 }
              : { scale: 1.5, opacity: 0 }
          }
          transition={
            phase === "hold"
              ? { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
              : { duration: 0.5 }
          }
        >
          <span className="curtain-badge-icon">🏏</span>
          <span className="curtain-badge-team">{teamCode}</span>
          <span className="curtain-badge-sub">AUCTION 2026</span>
        </motion.div>
      </div>

      {/* Title text during hold */}
      <div className="curtain-title-wrapper">
        <motion.div
          className="curtain-title"
          initial={{ y: 40, opacity: 0 }}
          animate={phase === "hold" ? { y: 0, opacity: 1 } : { y: -30, opacity: 0 }}
          transition={phase === "hold" ? { duration: 0.6, delay: 0.8 } : { duration: 0.3 }}
        >
          ENTERING THE ARENA
        </motion.div>
      </div>

      {/* Sparkle particles on open */}
      {phase === "opening" && (
        <div className="curtain-sparkles">
          {Array.from({ length: sparkleCount }).map((_, i) => {
            const angle = (Math.random() - 0.5) * 160;
            const distance = 100 + Math.random() * 400;
            const size = 3 + Math.random() * 6;
            const delay = Math.random() * 0.6;
            return (
              <motion.div
                key={i}
                className="curtain-sparkle"
                style={{ width: size, height: size }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos((angle * Math.PI) / 180) * distance,
                  y: Math.sin((angle * Math.PI) / 180) * distance - 100,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.5, 1, 0],
                }}
                transition={{ duration: 1.2, delay: 0.3 + delay, ease: "easeOut" }}
              />
            );
          })}
        </div>
      )}

      {/* Valance / pelmet across the top */}
      <motion.div
        className="curtain-valance"
        style={{ background: darken(primaryColor, 0.2) }}
        initial={{ y: 0 }}
        animate={phase === "opening" ? { y: "-110%" } : {}}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.6 }}
      >
        <div className="curtain-valance-fringe" style={{ borderColor: lighten(primaryColor, 0.3) }} />
      </motion.div>
    </div>
  );
}

function LiveAuctionContent() {
  const searchParams = useSearchParams();
  const teamCodeFromQuery = searchParams.get("team") as FranchiseCode | null;
  const franchise = teamCodeFromQuery ? FRANCHISE_BY_CODE[teamCodeFromQuery] : null;

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(AUCTION_PLAYERS[0].basePriceCr);
  const [purse, setPurse] = useState(INITIAL_PURSE);
  const [squadCount, setSquadCount] = useState(0);
  const [roles, setRoles] = useState<Record<PlayerRole, number>>({
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
    "Wicket-Keeper": 0,
  });
  const [activeStep, setActiveStep] = useState(BID_STEPS[0]);
  const [bidLog, setBidLog] = useState<{ text: string; type: "info" | "bid" | "sold" | "error" }[]>([
    { text: "Auction opened. Waiting for first bid.", type: "info" },
    { text: `Base purse allocated: ${toCr(INITIAL_PURSE)}`, type: "info" },
  ]);
  const [soldAnimation, setSoldAnimation] = useState(false);
  const [bidBounce, setBidBounce] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false); // start false, turn true after curtain
  const [soldPlayers, setSoldPlayers] = useState<Set<string>>(new Set());
  const [killfeed, setKillfeed] = useState<{ id: number; text: string; type: "bid" | "sold" | "error" | "info"; exiting: boolean }[]>([]);
  const [showCurtain, setShowCurtain] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const killfeedIdRef = useRef(0);

  const currentPlayer = AUCTION_PLAYERS[currentPlayerIndex];
  const spent = useMemo(() => Number((INITIAL_PURSE - purse).toFixed(2)), [purse]);
  const teamColor = franchise ? TEAM_COLORS[franchise.code] || TEAM_COLORS.CSK : TEAM_COLORS.CSK;

  // Countdown timer
  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer, timerActive]);

  // Reset timer on player change
  useEffect(() => {
    setTimer(30);
    setTimerActive(true);
  }, [currentPlayerIndex]);

  // Killfeed push helper — shows for 3s then fades out over 0.5s
  function pushKillfeed(text: string, type: "bid" | "sold" | "error" | "info") {
    const id = ++killfeedIdRef.current;
    setKillfeed((prev) => [{ id, text, type, exiting: false }, ...prev].slice(0, 5));
    // Start exit animation after 3s
    setTimeout(() => {
      setKillfeed((prev) => prev.map((n) => (n.id === id ? { ...n, exiting: true } : n)));
    }, 3000);
    // Remove from DOM after exit animation (0.5s)
    setTimeout(() => {
      setKillfeed((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }

  const selectPlayer = useCallback(
    (index: number) => {
      const nextPlayer = AUCTION_PLAYERS[index];
      setCurrentPlayerIndex(index);
      setCurrentBid(nextPlayer.basePriceCr);
    },
    [],
  );

  function raiseBid(step: number) {
    setCurrentBid((previous) => Number((previous + step).toFixed(2)));
    setBidBounce(true);
    setTimeout(() => setBidBounce(false), 400);
    const msg = `${franchise?.code} raised bid by ${toLakh(step)} for ${currentPlayer.name}`;
    setBidLog((previous) => [{ text: msg, type: "bid" }, ...previous]);
    pushKillfeed(msg, "bid");
    // Reset timer on each bid
    setTimer(30);
  }

  function resetBidToBase() {
    setCurrentBid(currentPlayer.basePriceCr);
  }

  function handlePlaceBid() {
    if (!franchise) return;

    if (squadCount >= 25) {
      const msg = "Squad already has 25 players!";
      setBidLog((prev) => [{ text: msg, type: "error" }, ...prev]);
      pushKillfeed(msg, "error");
      return;
    }

    if (currentBid > purse) {
      const msg = `Insufficient purse for ${currentPlayer.name}. Required ${toCr(currentBid)}.`;
      setBidLog((prev) => [{ text: msg, type: "error" }, ...prev]);
      pushKillfeed(msg, "error");
      return;
    }

    const updatedPurse = Number((purse - currentBid).toFixed(2));
    setPurse(updatedPurse);
    setSquadCount((prev) => prev + 1);
    setRoles((prev) => ({
      ...prev,
      [currentPlayer.role]: prev[currentPlayer.role] + 1,
    }));

    setSoldPlayers((prev) => new Set(prev).add(currentPlayer.id));
    setSoldAnimation(true);
    setTimerActive(false);
    setTimeout(() => setSoldAnimation(false), 2200);

    const soldMsg = `SOLD! ${currentPlayer.name} to ${franchise.name} for ${toCr(currentBid)}`;
    setBidLog((prev) => [{ text: soldMsg, type: "sold" }, ...prev]);
    pushKillfeed(soldMsg, "sold");

    setTimeout(() => {
      const upcomingIndex = nextIndex(currentPlayerIndex);
      const upcomingPlayer = AUCTION_PLAYERS[upcomingIndex];
      setCurrentPlayerIndex(upcomingIndex);
      setCurrentBid(upcomingPlayer.basePriceCr);
    }, 2500);
  }

  function handleSkip() {
    const msg = `${currentPlayer.name} — UNSOLD. No bids placed.`;
    setBidLog((prev) => [{ text: msg, type: "error" }, ...prev]);
    pushKillfeed(msg, "error");
    const upcomingIndex = nextIndex(currentPlayerIndex);
    const upcomingPlayer = AUCTION_PLAYERS[upcomingIndex];
    setCurrentPlayerIndex(upcomingIndex);
    setCurrentBid(upcomingPlayer.basePriceCr);
  }

  if (!franchise) {
    return (
      <main className="ipl-auction-page">
        <div className="ipl-no-team">
          <div className="ipl-no-team-card">
            <div className="ipl-no-team-icon">🏏</div>
            <h1>Live Auction</h1>
            <p>Please login as a franchise to access the auction room.</p>
            <Link href="/franchise/login" className="ipl-btn ipl-btn-primary">
              Go To Franchise Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const pursePercent = (purse / INITIAL_PURSE) * 100;

  return (
    <main
      className="ipl-auction-page"
      style={{
        "--team-primary": teamColor.primary,
        "--team-secondary": teamColor.secondary,
        "--team-glow": teamColor.glow,
      } as React.CSSProperties}
    >
      <AnimatePresence>
        {showCurtain && franchise && (
          <CurtainReveal
            primaryColor={teamColor.primary}
            teamCode={franchise.code}
            onComplete={() => {
              setShowCurtain(false);
              setTimerActive(true); // start timer after reveal
            }}
          />
        )}
      </AnimatePresence>

      {/* Animated dot-grid wave background */}
      <DotWaveBackground color={teamColor.primary} />

      {/* SOLD overlay */}
      {soldAnimation && (
        <div className="ipl-sold-overlay">
          <div className="ipl-sold-stamp">
            <span className="ipl-sold-text">SOLD!</span>
            <span className="ipl-sold-player">{currentPlayer.name}</span>
            <span className="ipl-sold-price">{toCr(currentBid)}</span>
            <span className="ipl-sold-team">to {franchise.name}</span>
          </div>
        </div>
      )}

      {/* BGMI-style killfeed notifications */}
      {killfeed.length > 0 && (
        <div className="ipl-killfeed">
          {killfeed.map((item) => (
            <div
              key={item.id}
              className={`ipl-killfeed-item ipl-kf-${item.type} ${item.exiting ? "ipl-kf-exit" : ""}`}
            >
              <span className="ipl-kf-icon">
                {item.type === "sold" ? "🔨" : item.type === "bid" ? "⬆" : item.type === "error" ? "⚠" : "ℹ"}
              </span>
              <span className="ipl-kf-text">{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top bar - broadcast style */}
      <header className="ipl-auction-header">
        <div className="ipl-header-left">
          <div className="ipl-logo-block">
            <span className="ipl-logo-icon">🏆</span>
            <div>
              <span className="ipl-logo-title">IPL AUCTION 2026</span>
              <span className="ipl-logo-sub">LIVE</span>
            </div>
          </div>
        </div>
        <div className="ipl-header-center">
          <div className="ipl-live-badge">
            <span className="ipl-live-dot" />
            LIVE
          </div>
        </div>
        <div className="ipl-header-right">
          <div className="ipl-team-badge" style={{ background: teamColor.primary, color: teamColor.secondary === "#ffd54f" || teamColor.secondary === "#b0bec5" ? "#fff" : teamColor.secondary }}>
            {franchise.code}
          </div>
          <span className="ipl-team-name-header">{franchise.name}</span>
          <div className="ipl-header-actions">
            <Link href={`/franchise/dashboard?team=${franchise.code}`} className="ipl-btn ipl-btn-ghost">
              ← Dashboard
            </Link>
            <Link href="/" className="ipl-btn ipl-btn-ghost">
              Logout
            </Link>
          </div>
        </div>
      </header>

      {/* Main auction area */}
      <div className="ipl-auction-body">
        {/* Left: Player Spotlight */}
        <section className="ipl-player-spotlight">
          <div className="ipl-player-card-main">
            {/* Player image area */}
            <div className="ipl-player-image-area">
              <div className="ipl-player-silhouette">
                <span className="ipl-player-role-icon">{ROLE_ICONS[currentPlayer.role]}</span>
              </div>
              <div className="ipl-player-country-flag">
                <span>{currentPlayer.country}</span>
              </div>
            </div>

            {/* Player details */}
            <div className="ipl-player-details">
              <div className="ipl-player-id-badge">#{currentPlayer.id}</div>
              <h1 className="ipl-player-name">{currentPlayer.name}</h1>
              <div className="ipl-player-role-badge">
                <span>{ROLE_ICONS[currentPlayer.role]}</span>
                {currentPlayer.role}
              </div>
              <div className="ipl-player-stats-row">
                <div className="ipl-player-stat">
                  <span className="ipl-stat-value">{currentPlayer.age}</span>
                  <span className="ipl-stat-label">Age</span>
                </div>
                <div className="ipl-player-stat">
                  <span className="ipl-stat-value">{currentPlayer.matches}</span>
                  <span className="ipl-stat-label">Matches</span>
                </div>
                <div className="ipl-player-stat">
                  <span className="ipl-stat-value">{currentPlayer.country}</span>
                  <span className="ipl-stat-label">Country</span>
                </div>
              </div>
            </div>

            {/* Price display */}
            <div className="ipl-price-display">
              <div className="ipl-base-price">
                <span className="ipl-price-label">BASE PRICE</span>
                <span className="ipl-price-value">{toLakh(currentPlayer.basePriceCr)}</span>
              </div>
              <div className={`ipl-current-bid ${bidBounce ? "ipl-bid-bounce" : ""}`}>
                <span className="ipl-price-label">CURRENT BID</span>
                <span className="ipl-price-value ipl-price-highlight">{toLakh(currentBid)}</span>
              </div>
            </div>

            {/* Timer */}
            <div className="ipl-timer-section">
              <div className={`ipl-timer-ring ${timer <= 10 ? "ipl-timer-urgent" : ""}`}>
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="ipl-timer-track" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="ipl-timer-progress"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 45}`,
                      strokeDashoffset: `${2 * Math.PI * 45 * (1 - timer / 30)}`,
                    }}
                  />
                </svg>
                <span className="ipl-timer-text">{timer}</span>
              </div>
              <span className="ipl-timer-label">seconds remaining</span>
            </div>
          </div>
        </section>

        {/* Right: Controls & Info */}
        <aside className="ipl-auction-controls">
          {/* Purse Panel */}
          <section className="ipl-purse-panel">
            <h2 className="ipl-panel-title">
              <span className="ipl-panel-icon">💰</span>
              Team Purse
            </h2>
            <div className="ipl-purse-bar-container">
              <div className="ipl-purse-bar">
                <div
                  className="ipl-purse-bar-fill"
                  style={{ width: `${pursePercent}%` }}
                />
              </div>
              <div className="ipl-purse-bar-labels">
                <span>Spent: {toCr(spent)}</span>
                <span>Remaining: {toCr(purse)}</span>
              </div>
            </div>
            <div className="ipl-purse-stats">
              <div className="ipl-purse-stat">
                <span className="ipl-purse-number">{toCr(INITIAL_PURSE)}</span>
                <span className="ipl-purse-label">Total</span>
              </div>
              <div className="ipl-purse-stat">
                <span className="ipl-purse-number" style={{ color: "#e53935" }}>{toCr(spent)}</span>
                <span className="ipl-purse-label">Spent</span>
              </div>
              <div className="ipl-purse-stat">
                <span className="ipl-purse-number" style={{ color: "#43a047" }}>{toCr(purse)}</span>
                <span className="ipl-purse-label">Remaining</span>
              </div>
            </div>
          </section>

          {/* Bid Panel */}
          <section className="ipl-bid-panel">
            <h2 className="ipl-panel-title">
              <span className="ipl-panel-icon">🔨</span>
              Place Your Bid
            </h2>
            <div className={`ipl-bid-amount ${bidBounce ? "ipl-bid-bounce" : ""}`}>
              {toLakh(currentBid)}
            </div>
            <div className="ipl-bid-increments">
              <span className="ipl-increment-label">Increment:</span>
              {BID_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className={`ipl-increment-btn ${activeStep === step ? "ipl-increment-active" : ""}`}
                  onClick={() => setActiveStep(step)}
                >
                  +{toLakh(step)}
                </button>
              ))}
            </div>
            <div className="ipl-bid-actions">
              <button type="button" className="ipl-btn ipl-btn-raise" onClick={() => raiseBid(activeStep)}>
                ⬆ Raise Bid
              </button>
              <button type="button" className="ipl-btn ipl-btn-reset" onClick={resetBidToBase}>
                ↩ Reset
              </button>
            </div>
            <button
              type="button"
              className="ipl-btn ipl-btn-sold"
              onClick={handlePlaceBid}
              disabled={soldAnimation}
            >
              🔨 PLACE BID — {toLakh(currentBid)}
            </button>
            <button type="button" className="ipl-btn ipl-btn-skip" onClick={handleSkip}>
              SKIP / UNSOLD
            </button>
          </section>

          {/* Team Composition */}
          <section className="ipl-composition-panel">
            <h2 className="ipl-panel-title">
              <span className="ipl-panel-icon">👥</span>
              Squad ({squadCount}/25)
            </h2>
            <div className="ipl-composition-grid">
              {(Object.entries(roles) as [PlayerRole, number][]).map(([role, count]) => (
                <div key={role} className="ipl-comp-item">
                  <span className="ipl-comp-icon">{ROLE_ICONS[role]}</span>
                  <span className="ipl-comp-count">{count}</span>
                  <span className="ipl-comp-role">{role}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Bid Log - ticker style */}
      <section className="ipl-bid-ticker">
        <div className="ipl-ticker-header">
          <span className="ipl-ticker-icon">📋</span>
          <h3>Auction Log</h3>
        </div>
        <div className="ipl-ticker-list">
          {bidLog.map((item, i) => (
            <div
              key={`${item.text}-${i}`}
              className={`ipl-ticker-item ipl-ticker-${item.type}`}
            >
              <span className="ipl-ticker-dot" />
              {item.text}
            </div>
          ))}
        </div>
      </section>

      {/* Player Queue - bottom strip */}
      <section className="ipl-player-queue">
        <h3 className="ipl-queue-title">Up Next</h3>
        <div className="ipl-queue-strip">
          {AUCTION_PLAYERS.map((player, index) => {
            const isSold = soldPlayers.has(player.id);
            const isActive = index === currentPlayerIndex;
            return (
              <button
                key={player.id}
                type="button"
                className={`ipl-queue-card ${isActive ? "ipl-queue-active" : ""} ${isSold ? "ipl-queue-sold" : ""}`}
                onClick={() => !isSold && selectPlayer(index)}
                disabled={isSold}
              >
                <div className="ipl-queue-card-inner">
                  <span className="ipl-queue-role">{ROLE_ICONS[player.role]}</span>
                  <strong>{player.name}</strong>
                  <span className="ipl-queue-meta">{player.role}</span>
                  <span className="ipl-queue-price">{toLakh(player.basePriceCr)}</span>
                  {isSold && <span className="ipl-queue-sold-tag">SOLD</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default function FranchiseLiveAuctionPage() {
  return (
    <Suspense
      fallback={
        <main className="ipl-auction-page">
          <div className="ipl-loading">
            <div className="ipl-loading-spinner" />
            <span>Entering Auction Room...</span>
          </div>
        </main>
      }
    >
      <LiveAuctionContent />
    </Suspense>
  );
}
