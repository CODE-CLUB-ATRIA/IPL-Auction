/* eslint-disable @next/next/no-img-element */
import type { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  className?: string;
}

const statusStyles: Record<string, string> = {
  bidding: "bg-[var(--team-primary)] text-[#0a0e17] border-[var(--team-primary)]",
  sold: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  unsold: "bg-slate-700/50 text-slate-400 border-slate-600/50",
};

const formatLakhs = (amount: number): string => {
  if (!amount) return "₹0 L";
  if (amount >= 100) {
    return `₹${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `₹${amount} L`;
};

const formatMetric = (value: number | undefined): string =>
  value !== undefined ? value.toFixed(1) : "N/A";

export default function PlayerCard({ player, className = "" }: PlayerCardProps) {
  const currentBidLabel = player.currentBidLakhs === 0 ? "No bids" : formatLakhs(player.currentBidLakhs);
  const lotNumber = player.slNo;

  const displayImage =
    player.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=94a3b8&size=512&bold=true`;

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1117]/80 text-slate-200 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl ${className}`}
    >
      {/* Dark gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--team-glow)_0%,_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_transparent_50%)]" />

      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--team-primary)] to-transparent opacity-80" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-10 lg:p-10">
        {/* Left Column - Image & Quick Stats */}
        <div className="grid gap-5">
          {/* Tags */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">
                {lotNumber !== null ? `Lot #${String(lotNumber).padStart(2, "0")}` : "Live Lot"}
              </span>
              <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest ${
                player.category === "Overseas"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-slate-600/50 bg-slate-700/30 text-slate-400"
              }`}>
                {player.category === "Overseas" ? "Overseas" : "Domestic"}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] ${statusStyles[player.status] || statusStyles.unsold}`}
            >
              {player.status}
            </span>
          </div>

          {/* Player Image */}
          <div className="relative mx-auto flex aspect-[4/5] w-full max-w-[320px] items-end justify-center overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-x-6 top-5 h-px bg-gradient-to-r from-transparent via-[var(--team-primary)]/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
            <img
              src={displayImage}
              alt={player.name}
              className="h-[92%] w-[92%] object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.5)]"
            />
          </div>

          {/* Quick Stats */}
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-slate-500">Vital Statistics</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Matches</p>
                <p className="mt-1 font-display text-2xl text-slate-200">{player.stats.matches}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">H.S.</p>
                <p className="mt-1 font-display text-2xl text-slate-200">{player.stats.highestScore || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="grid gap-6">
          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[var(--team-text)]">{player.role}</p>
              <p className="text-[0.7rem] font-bold tracking-widest text-slate-500">{player.country}</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <h1 className="font-display text-4xl leading-none text-white sm:text-5xl lg:text-[4rem]">{player.name}</h1>
              <div className="h-px min-w-24 flex-1 bg-gradient-to-r from-[var(--team-primary)] to-transparent opacity-60" />
            </div>

            <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-slate-500">
              Former: <span className="text-slate-300">{player.teams || "N/A"}</span>
            </p>
          </div>

          {/* Price Cards */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Base Price */}
            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 text-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.36em] text-slate-500">Base Price</p>
              <p className="mt-4 font-display text-4xl leading-none text-white sm:text-[3.2rem]">{formatLakhs(player.basePriceLakhs)}</p>
              <p className="mt-3 text-sm uppercase tracking-[0.22em] text-slate-500">Reserve Valuation</p>
            </section>

            {/* Current Bid - Highlighted */}
            <section className="relative rounded-[1.6rem] border border-[var(--team-primary)]/30 bg-gradient-to-br from-[var(--team-surface)] to-transparent p-6 text-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-[1.6rem] bg-[var(--team-primary)]/5" />
              <div className="relative">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.36em] text-[var(--team-text)]">Current Bid</p>
                <p className="mt-4 font-display text-4xl leading-none text-white sm:text-[3.2rem]">{currentBidLabel}</p>
                <p className="mt-3 text-sm uppercase tracking-[0.22em] text-slate-400">
                  {player.currentBidLakhs === 0 ? "Waiting for Entry" : "Live High Offer"}
                </p>
              </div>
            </section>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {player.stats.runs !== undefined ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Runs</p>
                <p className="mt-2 font-display text-3xl leading-none text-slate-200">{player.stats.runs}</p>
              </div>
            ) : null}

            {player.stats.wickets !== undefined && player.stats.wickets > 0 ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Wickets</p>
                <p className="mt-2 font-display text-3xl leading-none text-slate-200">{player.stats.wickets}</p>
              </div>
            ) : null}

            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Average</p>
              <p className="mt-2 font-display text-3xl leading-none text-slate-200">{formatMetric(player.stats.average)}</p>
            </div>

            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">S.R.</p>
              <p className="mt-2 font-display text-3xl leading-none text-slate-200">{formatMetric(player.stats.strikeRate)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
