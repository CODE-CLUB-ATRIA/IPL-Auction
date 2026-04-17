import type { AdminPlayer } from "@/hooks/usePlayers";
import type { AdminTeam } from "@/hooks/useTeams";

type TeamDetailsProps = {
  selectedTeam: AdminTeam | null;
  teams: AdminTeam[];
  teamPlayers: AdminPlayer[];
  assignablePlayers: AdminPlayer[];
  playerCounts: Record<string, number>;
  purseAmount: string;
  playerSearch: string;
  selectedAssignPlayerId: string;
  transferTargets: Record<string, string>;
  isSaving: boolean;
  onPurseAmountChange: (value: string) => void;
  onPlayerSearchChange: (value: string) => void;
  onSelectedAssignPlayerChange: (playerId: string) => void;
  onTransferTargetChange: (playerId: string, teamId: string) => void;
  onBlockTeam: () => void;
  onUnblockTeam: () => void;
  onIncreasePurse: () => void;
  onDecreasePurse: () => void;
  onResetTeam: () => void;
  onRemovePlayer: (player: AdminPlayer) => void;
  onTransferPlayer: (player: AdminPlayer) => void;
  onAssignPlayer: () => void;
  onForceSellCurrentPlayer: () => void;
  formatMoney: (amount: number) => string;
};

const buttonClass =
  "rounded-full border border-cyan-300/18 bg-cyan-300/10 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14 disabled:opacity-50";

export default function TeamDetails({
  selectedTeam,
  teams,
  teamPlayers,
  assignablePlayers,
  playerCounts,
  purseAmount,
  playerSearch,
  selectedAssignPlayerId,
  transferTargets,
  isSaving,
  onPurseAmountChange,
  onPlayerSearchChange,
  onSelectedAssignPlayerChange,
  onTransferTargetChange,
  onBlockTeam,
  onUnblockTeam,
  onIncreasePurse,
  onDecreasePurse,
  onResetTeam,
  onRemovePlayer,
  onTransferPlayer,
  onAssignPlayer,
  onForceSellCurrentPlayer,
  formatMoney,
}: TeamDetailsProps) {
  if (!selectedTeam) {
    return (
      <section className="basis-[60%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
        <div className="grid min-h-[58vh] place-items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-cyan-100/70">
            Select a team
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="basis-[60%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
      <div className="mb-5 border-b border-cyan-300/10 pb-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
          Team Details
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
              {selectedTeam.name}
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-100/70">
              Status: {selectedTeam.isBlocked ? "BLOCKED" : "ACTIVE"}
            </p>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.24em] text-cyan-100/70">
            <p>Purse: {formatMoney(selectedTeam.purse)}</p>
            <p className="mt-2">Players: {playerCounts[selectedTeam.assignmentId] ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onBlockTeam} disabled={isSaving || selectedTeam.isBlocked} className={buttonClass}>
            Block Team
          </button>
          <button type="button" onClick={onUnblockTeam} disabled={isSaving || !selectedTeam.isBlocked} className={buttonClass}>
            Unblock Team
          </button>
          <button type="button" onClick={onResetTeam} disabled={isSaving} className={buttonClass}>
            Reset Team
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="number"
            min="0"
            step="1"
            value={purseAmount}
            onChange={(event) => onPurseAmountChange(event.target.value)}
            placeholder="Purse amount"
            className="rounded-[1rem] border border-cyan-300/18 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-cyan-100/35"
          />
          <button type="button" onClick={onIncreasePurse} disabled={isSaving} className={buttonClass}>
            Increase Purse
          </button>
          <button type="button" onClick={onDecreasePurse} disabled={isSaving} className={buttonClass}>
            Decrease Purse
          </button>
        </div>

        <div className="grid gap-3 border-t border-cyan-300/10 pt-5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
            Quick Actions
          </p>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <input
              type="search"
              value={playerSearch}
              onChange={(event) => onPlayerSearchChange(event.target.value)}
              placeholder="Search unassigned player"
              className="rounded-[1rem] border border-cyan-300/18 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-cyan-100/35"
            />
            <select
              value={selectedAssignPlayerId}
              onChange={(event) => onSelectedAssignPlayerChange(event.target.value)}
              className="rounded-[1rem] border border-cyan-300/18 bg-[#04131f] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Select player</option>
              {assignablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={onAssignPlayer} disabled={isSaving || !selectedAssignPlayerId} className={buttonClass}>
              Assign Player
            </button>
          </div>
          <button type="button" onClick={onForceSellCurrentPlayer} disabled={isSaving} className={buttonClass}>
            Force Sell Current Auction Player
          </button>
        </div>

        <div className="border-t border-cyan-300/10 pt-5">
          <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
            Players
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="text-[0.62rem] uppercase tracking-[0.24em] text-cyan-100/55">
                <tr className="border-b border-cyan-300/10">
                  <th className="py-3 pr-4 font-semibold">Name</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Sold Price</th>
                  <th className="py-3 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-cyan-50/85">
                {teamPlayers.map((player) => (
                  <tr key={player.id} className="border-b border-cyan-300/10">
                    <td className="py-3 pr-4 font-semibold text-white">{player.name}</td>
                    <td className="py-3 pr-4">{player.role}</td>
                    <td className="py-3 pr-4">{formatMoney(player.soldPrice)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onRemovePlayer(player)} disabled={isSaving} className={buttonClass}>
                          Remove Player
                        </button>
                        <select
                          value={transferTargets[player.id] ?? ""}
                          onChange={(event) => onTransferTargetChange(player.id, event.target.value)}
                          className="rounded-full border border-cyan-300/18 bg-[#04131f] px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-cyan-100 outline-none"
                        >
                          <option value="">Transfer to</option>
                          {teams
                            .filter((team) => team.id !== selectedTeam.id)
                            .map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onTransferPlayer(player)}
                          disabled={isSaving || !transferTargets[player.id]}
                          className={buttonClass}
                        >
                          Transfer Player
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teamPlayers.length === 0 ? (
            <p className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-cyan-100/70">
              No players assigned to this team.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

