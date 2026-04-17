import type { AdminPlayer } from "@/hooks/usePlayers";
import type { AdminTeam } from "@/hooks/useTeams";

type PlayerListProps = {
  players: AdminPlayer[];
  teams: AdminTeam[];
  searchQuery: string;
  selectedPlayerId: string;
  onSearchChange: (value: string) => void;
  onSelectPlayer: (playerId: string) => void;
  formatMoney: (amount: number) => string;
};

export default function PlayerList({
  players,
  teams,
  searchQuery,
  selectedPlayerId,
  onSearchChange,
  onSelectPlayer,
  formatMoney,
}: PlayerListProps) {
  const getTeamName = (assignmentId: string | null) => {
    if (!assignmentId) return "No Team";
    return teams.find((team) => team.assignmentId === assignmentId)?.name ?? "Unknown Team";
  };

  return (
    <section className="basis-[40%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
      <div className="mb-5 border-b border-cyan-300/10 pb-4">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
          Player List
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">
          Players
        </h1>
      </div>

      <input
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search player name"
        className="mb-4 w-full rounded-[1rem] border border-cyan-300/18 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-cyan-100/35"
      />

      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        {players.map((player) => {
          const isSelected = player.id === selectedPlayerId;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelectPlayer(player.id)}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-cyan-300/50 bg-cyan-300/12"
                  : "border-white/10 bg-white/[0.03] hover:border-cyan-300/28 hover:bg-cyan-300/8"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    {player.name}
                  </h2>
                  <p className="mt-2 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-200/75">
                    {player.role}
                  </p>
                </div>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
                  {player.isSold ? "SOLD" : "AVAILABLE"}
                </span>
              </div>
              <div className="mt-3 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-100/70">
                <p>Base Price: {formatMoney(player.basePrice)}</p>
                <p className="mt-2">Team: {getTeamName(player.teamId)}</p>
              </div>
            </button>
          );
        })}

        {players.length === 0 ? (
          <p className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-cyan-100/70">
            No players match the current search.
          </p>
        ) : null}
      </div>
    </section>
  );
}

