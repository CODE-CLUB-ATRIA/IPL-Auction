import type { AdminPlayer } from "@/hooks/usePlayers";
import type { AdminTeam } from "@/hooks/useTeams";

type PlayerDetailsProps = {
  player: AdminPlayer | null;
  teams: AdminTeam[];
  selectedTeamId: string;
  transferTeamId: string;
  basePriceInput: string;
  forceSellPriceInput: string;
  isSaving: boolean;
  onSelectedTeamChange: (value: string) => void;
  onTransferTeamChange: (value: string) => void;
  onBasePriceInputChange: (value: string) => void;
  onForceSellPriceInputChange: (value: string) => void;
  onAssignToTeam: () => void;
  onTransferPlayer: () => void;
  onRemoveFromTeam: () => void;
  onResetPlayer: () => void;
  onEditBasePrice: () => void;
  onForceSell: () => void;
  onAddToAuction: () => void;
  formatMoney: (amount: number) => string;
};

const buttonClass =
  "rounded-full border border-cyan-300/18 bg-cyan-300/10 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14 disabled:opacity-50";

export default function PlayerDetails({
  player,
  teams,
  selectedTeamId,
  transferTeamId,
  basePriceInput,
  forceSellPriceInput,
  isSaving,
  onSelectedTeamChange,
  onTransferTeamChange,
  onBasePriceInputChange,
  onForceSellPriceInputChange,
  onAssignToTeam,
  onTransferPlayer,
  onRemoveFromTeam,
  onResetPlayer,
  onEditBasePrice,
  onForceSell,
  onAddToAuction,
  formatMoney,
}: PlayerDetailsProps) {
  if (!player) {
    return (
      <section className="basis-[60%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
        <div className="grid min-h-[58vh] place-items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-cyan-100/70">
            Select a player
          </p>
        </div>
      </section>
    );
  }

  const currentTeam = teams.find((team) => team.assignmentId === player.teamId) ?? null;

  return (
    <section className="basis-[60%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
      <div className="mb-5 border-b border-cyan-300/10 pb-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
          Player Details
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
              {player.name}
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-100/70">
              {player.role}
            </p>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.24em] text-cyan-100/70">
            <p>Status: {player.isSold ? "SOLD" : "AVAILABLE"}</p>
            <p className="mt-2">Current Team: {currentTeam?.name ?? "No Team"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
              Base Price
            </p>
            <p className="mt-2 text-lg font-bold text-white">{formatMoney(player.basePrice)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
              Sold Price
            </p>
            <p className="mt-2 text-lg font-bold text-white">{formatMoney(player.soldPrice)}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-cyan-300/10 pt-5 lg:grid-cols-[1fr_auto]">
          <select
            value={selectedTeamId}
            onChange={(event) => onSelectedTeamChange(event.target.value)}
            className="rounded-[1rem] border border-cyan-300/18 bg-[#04131f] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={onAssignToTeam} disabled={isSaving || !selectedTeamId} className={buttonClass}>
            Assign to Team
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <select
            value={transferTeamId}
            onChange={(event) => onTransferTeamChange(event.target.value)}
            className="rounded-[1rem] border border-cyan-300/18 bg-[#04131f] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Transfer to team</option>
            {teams
              .filter((team) => team.assignmentId !== player.teamId)
              .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={onTransferPlayer} disabled={isSaving || !transferTeamId} className={buttonClass}>
            Transfer Player
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRemoveFromTeam} disabled={isSaving} className={buttonClass}>
            Remove from Team
          </button>
          <button type="button" onClick={onResetPlayer} disabled={isSaving} className={buttonClass}>
            Reset Player
          </button>
          <button type="button" onClick={onAddToAuction} disabled={isSaving} className={buttonClass}>
            Add to Auction
          </button>
        </div>

        <div className="grid gap-3 border-t border-cyan-300/10 pt-5 lg:grid-cols-[1fr_auto]">
          <input
            type="number"
            min="0"
            step="1"
            value={basePriceInput}
            onChange={(event) => onBasePriceInputChange(event.target.value)}
            placeholder="Base price"
            className="rounded-[1rem] border border-cyan-300/18 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-cyan-100/35"
          />
          <button type="button" onClick={onEditBasePrice} disabled={isSaving || !basePriceInput} className={buttonClass}>
            Edit Base Price
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            type="number"
            min="0"
            step="1"
            value={forceSellPriceInput}
            onChange={(event) => onForceSellPriceInputChange(event.target.value)}
            placeholder="Force sell price"
            className="rounded-[1rem] border border-cyan-300/18 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-cyan-100/35"
          />
          <button type="button" onClick={onForceSell} disabled={isSaving || !selectedTeamId || !forceSellPriceInput} className={buttonClass}>
            Force Sell
          </button>
        </div>
      </div>
    </section>
  );
}
