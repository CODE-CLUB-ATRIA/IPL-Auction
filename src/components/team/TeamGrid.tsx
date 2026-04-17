import type { AdminTeam } from "@/hooks/useTeams";

type TeamGridProps = {
  teams: AdminTeam[];
  selectedTeamId: string;
  playerCounts: Record<string, number>;
  onSelectTeam: (teamId: string) => void;
  formatMoney: (amount: number) => string;
};

export default function TeamGrid({
  teams,
  selectedTeamId,
  playerCounts,
  onSelectTeam,
  formatMoney,
}: TeamGridProps) {
  return (
    <section className="basis-[40%] rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
      <div className="mb-5 border-b border-cyan-300/10 pb-4">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
          Team Grid
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">
          Teams
        </h1>
      </div>

      <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1">
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
              className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-cyan-300/50 bg-cyan-300/12"
                  : "border-white/10 bg-white/[0.03] hover:border-cyan-300/28 hover:bg-cyan-300/8"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    {team.name}
                  </h2>
                  <p className="mt-2 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-200/75">
                    Purse: {formatMoney(team.purse)}
                  </p>
                </div>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
                  {team.isBlocked ? "BLOCKED" : "ACTIVE"}
                </span>
              </div>
              <p className="mt-3 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-100/70">
                Players: {playerCounts[team.assignmentId] ?? 0}
              </p>
            </button>
          );
        })}

        {teams.length === 0 ? (
          <p className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-cyan-100/70">
            No teams found.
          </p>
        ) : null}
      </div>
    </section>
  );
}

