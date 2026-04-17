"use client";

import { useEffect, useMemo, useState } from "react";
import TeamDetails from "@/components/team/TeamDetails";
import TeamGrid from "@/components/team/TeamGrid";
import { usePlayers, type AdminPlayer } from "@/hooks/usePlayers";
import { useTeams, type AdminTeam } from "@/hooks/useTeams";
import { SUPER_ADMIN_EMAIL } from "@/lib/admin-users";
import { supabase } from "@/lib/supabase-client";
import { useAuthGuard } from "@/lib/useAuthGuard";

const formatLakhs = (amount: number): string => {
  if (!amount) return "Rs 0 L";
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `Rs ${amount} L`;
};

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
  return 0;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to update team control room.";
};

export default function AdminTeamsPage() {
  useAuthGuard(SUPER_ADMIN_EMAIL);

  const { teams, isLoading: isTeamsLoading, errorMessage: teamsError, refetch: refetchTeams } = useTeams();
  const { players, isLoading: isPlayersLoading, errorMessage: playersError, refetch: refetchPlayers } = usePlayers();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [purseAmount, setPurseAmount] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedAssignPlayerId, setSelectedAssignPlayerId] = useState("");
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const usesFranchiseSchema = useMemo(() => {
    return teams.some((team) => Boolean(team.franchiseCode)) || players.some((player) => "assigned_franchise_code" in player.raw);
  }, [players, teams]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const playerCounts = useMemo(() => {
    return players.reduce<Record<string, number>>((counts, player) => {
      if (!player.teamId) return counts;
      counts[player.teamId] = (counts[player.teamId] ?? 0) + 1;
      return counts;
    }, {});
  }, [players]);

  const teamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return players.filter((player) => player.teamId === selectedTeam.assignmentId);
  }, [players, selectedTeam]);

  const assignablePlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    return players
      .filter((player) => !player.teamId)
      .filter((player) => !query || player.name.toLowerCase().includes(query))
      .slice(0, 30);
  }, [playerSearch, players]);

  const isLoading = isTeamsLoading || isPlayersLoading;

  useEffect(() => {
    setSelectedTeamId((currentId) => {
      if (teams.some((team) => team.id === currentId)) return currentId;
      return teams[0]?.id ?? "";
    });
  }, [teams]);

  useEffect(() => {
    setSelectedAssignPlayerId((currentId) => {
      if (assignablePlayers.some((player) => player.id === currentId)) return currentId;
      return "";
    });
  }, [assignablePlayers]);

  const refreshAll = async () => {
    await Promise.all([refetchTeams(), refetchPlayers()]);
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      await action();
      await refreshAll();
      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const getPurseAmount = () => {
    const amount = Number(purseAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Enter a valid purse amount.");
    }
    return Math.round(amount);
  };

  const getPlayerClearUpdate = () => {
    if (usesFranchiseSchema) {
      return {
        assigned_franchise_code: null,
        current_bid_lakhs: 0,
        last_bidder_code: null,
        auction_status: "unsold",
        assigned_at: null,
      };
    }

    return {
      team_id: null,
      is_sold: false,
      sold_price: null,
    };
  };

  const getPlayerAssignUpdate = (team: AdminTeam, soldPrice: number) => {
    if (usesFranchiseSchema) {
      return {
        assigned_franchise_code: team.assignmentId,
        current_bid_lakhs: soldPrice,
        last_bidder_code: team.assignmentId,
        auction_status: "sold",
        assigned_at: new Date().toISOString(),
      };
    }

    return {
      team_id: team.id,
      is_sold: true,
      sold_price: soldPrice,
    };
  };

  const updateTeamFinance = async (team: AdminTeam, purseDelta: number, rosterDelta = 0) => {
    if (usesFranchiseSchema) {
      const spentLakhs = Math.max(readNumber(team.raw.spent_lakhs) - purseDelta, 0);
      const rosterCount = Math.max(readNumber(team.raw.roster_count) + rosterDelta, 0);
      const { error } = await supabase
        .from("teams")
        .update({ spent_lakhs: spentLakhs, roster_count: rosterCount })
        .eq("id", team.id);

      if (error) throw error;
      return;
    }

    const nextPurse = Math.max(team.purse + purseDelta, 0);
    const { error } = await supabase.from("teams").update({ purse: nextPurse }).eq("id", team.id);
    if (error) throw error;
  };

  const setTeamBlocked = async (isBlocked: boolean) => {
    if (!selectedTeam) return;
    await runAction(async () => {
      const { error } = await supabase.from("teams").update({ is_blocked: isBlocked }).eq("id", selectedTeam.id);
      if (error) throw error;
    }, isBlocked ? "Team blocked." : "Team unblocked.");
  };

  const changePurse = async (direction: "increase" | "decrease") => {
    if (!selectedTeam) return;

    await runAction(async () => {
      const amount = getPurseAmount();

      if (usesFranchiseSchema) {
        const totalBudget = readNumber(selectedTeam.raw.purse_lakhs);
        const spentLakhs = readNumber(selectedTeam.raw.spent_lakhs);
        const nextBudget = direction === "increase" ? totalBudget + amount : Math.max(totalBudget - amount, spentLakhs);
        const { error } = await supabase.from("teams").update({ purse_lakhs: nextBudget }).eq("id", selectedTeam.id);
        if (error) throw error;
        return;
      }

      const nextPurse = direction === "increase" ? selectedTeam.purse + amount : Math.max(selectedTeam.purse - amount, 0);
      const { error } = await supabase.from("teams").update({ purse: nextPurse }).eq("id", selectedTeam.id);
      if (error) throw error;
    }, direction === "increase" ? "Purse increased." : "Purse decreased.");
  };

  const resetTeam = async () => {
    if (!selectedTeam) return;

    await runAction(async () => {
      const playerColumn = usesFranchiseSchema ? "assigned_franchise_code" : "team_id";
      const { error: playersUpdateError } = await supabase
        .from("players")
        .update(getPlayerClearUpdate())
        .eq(playerColumn, selectedTeam.assignmentId);

      if (playersUpdateError) throw playersUpdateError;

      const teamUpdate = usesFranchiseSchema
        ? { purse_lakhs: selectedTeam.initialPurse, spent_lakhs: 0, roster_count: 0, is_blocked: false }
        : { purse: selectedTeam.initialPurse, is_blocked: false };

      const { error: teamUpdateError } = await supabase.from("teams").update(teamUpdate).eq("id", selectedTeam.id);
      if (teamUpdateError) throw teamUpdateError;
    }, "Team reset.");
  };

  const removePlayer = async (player: AdminPlayer) => {
    if (!selectedTeam) return;

    await runAction(async () => {
      const { error } = await supabase.from("players").update(getPlayerClearUpdate()).eq("id", player.id);
      if (error) throw error;

      await updateTeamFinance(selectedTeam, player.soldPrice, -1);
    }, `${player.name} removed.`);
  };

  const transferPlayer = async (player: AdminPlayer) => {
    if (!selectedTeam) return;

    const targetTeam = teams.find((team) => team.id === transferTargets[player.id]) ?? null;
    if (!targetTeam) {
      setErrorMessage("Select a transfer team first.");
      return;
    }

    if (targetTeam.isBlocked) {
      setErrorMessage("Cannot transfer to a blocked team.");
      return;
    }

    if (targetTeam.purse < player.soldPrice) {
      setErrorMessage("Cannot reduce target team purse below 0.");
      return;
    }

    await runAction(async () => {
      await updateTeamFinance(selectedTeam, player.soldPrice, -1);
      await updateTeamFinance(targetTeam, -player.soldPrice, 1);

      const { error } = await supabase
        .from("players")
        .update(getPlayerAssignUpdate(targetTeam, player.soldPrice))
        .eq("id", player.id);

      if (error) throw error;
    }, `${player.name} transferred.`);
  };

  const assignPlayer = async () => {
    if (!selectedTeam) return;
    const player = players.find((entry) => entry.id === selectedAssignPlayerId) ?? null;

    if (!player) {
      setErrorMessage("Select a player first.");
      return;
    }

    if (selectedTeam.isBlocked) {
      setErrorMessage("Cannot assign player to a blocked team.");
      return;
    }

    if (player.teamId) {
      setErrorMessage("Cannot assign player already in another team.");
      return;
    }

    await runAction(async () => {
      const { error } = await supabase.from("players").update(getPlayerAssignUpdate(selectedTeam, 0)).eq("id", player.id);
      if (error) throw error;

      await updateTeamFinance(selectedTeam, 0, 1);
    }, `${player.name} assigned.`);
  };

  const forceSellCurrentAuctionPlayer = async () => {
    if (!selectedTeam) return;

    if (selectedTeam.isBlocked) {
      setErrorMessage("Cannot assign player to a blocked team.");
      return;
    }

    await runAction(async () => {
      const { data: auctionState, error: auctionError } = await supabase
        .from("auction_state")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (auctionError) throw auctionError;
      if (!auctionState?.current_player_id) throw new Error("No current auction player found.");

      const player = players.find((entry) => entry.id === auctionState.current_player_id) ?? null;
      if (!player) throw new Error("Current auction player is not loaded.");
      if (player.teamId) throw new Error("Cannot assign player already in another team.");

      const soldPrice = readNumber(auctionState.current_bid_lakhs ?? auctionState.current_bid);
      if (selectedTeam.purse < soldPrice) throw new Error("Cannot reduce purse below 0.");

      const { error: playerError } = await supabase
        .from("players")
        .update(getPlayerAssignUpdate(selectedTeam, soldPrice))
        .eq("id", player.id);

      if (playerError) throw playerError;

      await updateTeamFinance(selectedTeam, -soldPrice, 1);
    }, "Current auction player force sold.");
  };

  return (
    <main className="min-h-screen bg-[#01070c] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/80 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
            Control Room
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Team Control Room
          </h1>
        </header>

        {errorMessage || teamsError || playersError ? (
          <section className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100">
            {errorMessage || teamsError || playersError}
          </section>
        ) : null}

        {message ? (
          <section className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-emerald-100">
            {message}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 text-cyan-100/70">
            Loading teams...
          </section>
        ) : (
          <div className="flex gap-6">
            <TeamGrid
              teams={teams}
              selectedTeamId={selectedTeamId}
              playerCounts={playerCounts}
              onSelectTeam={setSelectedTeamId}
              formatMoney={formatLakhs}
            />
            <TeamDetails
              selectedTeam={selectedTeam}
              teams={teams}
              teamPlayers={teamPlayers}
              assignablePlayers={assignablePlayers}
              playerCounts={playerCounts}
              purseAmount={purseAmount}
              playerSearch={playerSearch}
              selectedAssignPlayerId={selectedAssignPlayerId}
              transferTargets={transferTargets}
              isSaving={isSaving}
              onPurseAmountChange={setPurseAmount}
              onPlayerSearchChange={setPlayerSearch}
              onSelectedAssignPlayerChange={setSelectedAssignPlayerId}
              onTransferTargetChange={(playerId, teamId) =>
                setTransferTargets((currentTargets) => ({
                  ...currentTargets,
                  [playerId]: teamId,
                }))
              }
              onBlockTeam={() => void setTeamBlocked(true)}
              onUnblockTeam={() => void setTeamBlocked(false)}
              onIncreasePurse={() => void changePurse("increase")}
              onDecreasePurse={() => void changePurse("decrease")}
              onResetTeam={() => void resetTeam()}
              onRemovePlayer={(player) => void removePlayer(player)}
              onTransferPlayer={(player) => void transferPlayer(player)}
              onAssignPlayer={() => void assignPlayer()}
              onForceSellCurrentPlayer={() => void forceSellCurrentAuctionPlayer()}
              formatMoney={formatLakhs}
            />
          </div>
        )}
      </div>
    </main>
  );
}

