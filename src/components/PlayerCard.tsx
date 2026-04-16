/* eslint-disable @next/next/no-img-element */
import type { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  className?: string;
}

const statusStyles: Record<string, string> = {
  bidding: "bg-[#082854] text-[#fdfbf7] border-[#082854]",
  sold: "bg-[#c8a34f] text-[#082854] border-[#b48b34]",
  unsold: "bg-[#f3e6cc] text-[#7a2323] border-[#d8c097]",
};

const formatLakhs = (amount: number): string => {
  if (!amount) return "Rs 0 L";
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `Rs ${amount} L`;
};

const formatMetric = (value: number | undefined): string =>
  value !== undefined ? value.toFixed(1) : "N/A";

export default function PlayerCard({ player, className = "" }: PlayerCardProps) {
  const currentBidLabel = player.currentBidLakhs === 0 ? "No bids yet" : formatLakhs(player.currentBidLakhs);
  const lotNumber = player.slNo;

  const displayImage =
    player.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=082854&color=fff&size=512&bold=true`;

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] border border-[#d9cdb5] bg-[#fdfbf7] text-[#082854] shadow-[0_30px_80px_rgba(8,40,84,0.16)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(200,163,79,0.22),_transparent_28%),linear-gradient(135deg,_rgba(8,40,84,0.04),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(253,251,247,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#082854] via-[#c8a34f] to-[#082854]" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-10 lg:p-10">
        <div className="grid gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center rounded-full border border-[#d7c7a7] bg-white/85 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[#6e5a2d]">
                {lotNumber !== null ? `Lot #${String(lotNumber).padStart(2, "0")}` : "Live Lot"}
              </span>
              <span className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-blue-800">
                {player.category === "Overseas" ? "Overseas" : "Domestic"}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] ${statusStyles[player.status] || statusStyles.unsold}`}
            >
              {player.status}
            </span>
          </div>

          <div className="relative mx-auto flex aspect-[4/5] w-full max-w-[320px] items-end justify-center overflow-hidden rounded-[1.7rem] border border-[#dbcba8] bg-[linear-gradient(180deg,#efe3c6_0%,#d7bf8b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="absolute inset-x-6 top-5 h-px bg-gradient-to-r from-transparent via-[#082854]/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(8,40,84,0.12)_100%)]" />
            <img
              src={displayImage}
              alt={player.name}
              className="h-[92%] w-[92%] object-contain drop-shadow-[0_22px_30px_rgba(8,40,84,0.25)]"
            />
          </div>

          <div className="rounded-[1.5rem] border border-[#decfae] bg-[#fffdfa] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[#6b5a37]">Vital Statistics</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e8dcc4] bg-[#fffaf0] px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">Matches</p>
                <p className="mt-1 font-display text-2xl">{player.stats.matches}</p>
              </div>
              <div className="rounded-2xl border border-[#e8dcc4] bg-[#fffaf0] px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">H.S.</p>
                <p className="mt-1 font-display text-2xl">{player.stats.highestScore || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#7d6a39]">{player.role}</p>
              <p className="text-[0.7rem] font-bold tracking-widest text-[#082854]/40">{player.country}</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <h1 className="font-display text-4xl leading-none sm:text-5xl lg:text-[4rem]">{player.name}</h1>
              <div className="h-px min-w-24 flex-1 bg-gradient-to-r from-[#c8a34f] via-[#082854]/35 to-transparent" />
            </div>

            <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#5f6980]">
              Former: <span className="text-[#082854]">{player.teams || "N/A"}</span>
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[1.6rem] border border-[#0e2a57] bg-[#082854] p-6 text-[#fdfbf7] shadow-[0_20px_40px_rgba(8,40,84,0.2)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.36em] text-[#d4b467]">Base Price</p>
              <p className="mt-4 font-display text-4xl leading-none sm:text-[3.2rem]">{formatLakhs(player.basePriceLakhs)}</p>
              <p className="mt-3 text-sm uppercase tracking-[0.22em] text-[#d9dfef]">Reserve Valuation</p>
            </section>

            <section className="rounded-[1.6rem] border border-[#d8bd79] bg-[linear-gradient(135deg,#f8edd3_0%,#efd29a_100%)] p-6 text-[#082854] shadow-[0_20px_40px_rgba(200,163,79,0.18)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.36em] text-[#7c6430]">Current Bid</p>
              <p className="mt-4 font-display text-4xl leading-none sm:text-[3.2rem]">{currentBidLabel}</p>
              <p className="mt-3 text-sm uppercase tracking-[0.22em] text-[#5f4a1d]">
                {player.currentBidLakhs === 0 ? "Waiting for Entry" : "Live High Offer"}
              </p>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {player.stats.runs !== undefined ? (
              <div className="rounded-[1.35rem] border border-[#e5d7bc] bg-white/90 px-5 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">Runs</p>
                <p className="mt-2 font-display text-3xl leading-none">{player.stats.runs}</p>
              </div>
            ) : null}

            {player.stats.wickets !== undefined && player.stats.wickets > 0 ? (
              <div className="rounded-[1.35rem] border border-[#e5d7bc] bg-white/90 px-5 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">Wickets</p>
                <p className="mt-2 font-display text-3xl leading-none">{player.stats.wickets}</p>
              </div>
            ) : null}

            <div className="rounded-[1.35rem] border border-[#e5d7bc] bg-white/90 px-5 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">Average</p>
              <p className="mt-2 font-display text-3xl leading-none">{formatMetric(player.stats.average)}</p>
            </div>

            <div className="rounded-[1.35rem] border border-[#e5d7bc] bg-white/90 px-5 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#776744]">S.R.</p>
              <p className="mt-2 font-display text-3xl leading-none">{formatMetric(player.stats.strikeRate)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
