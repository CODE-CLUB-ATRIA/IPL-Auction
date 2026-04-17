"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerDetails from "@/components/player/PlayerDetails";
import PlayerList from "@/components/player/PlayerList";
import { usePlayers } from "@/hooks/usePlayers";
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
  return error instanceof Error ? error.message : "Unable to update player control room.";
};

export default function AdminPlayersPage() {
  useAuthGuard(SUPER_ADMIN_EMAIL);

  const { players, isLoading: isPlayersLoading, errorMessage: playersError, refetch: refetchPlayers } = usePlayers();
  const { teams, isLoading: isTeamsLoading, errorMessage: teamsError, refetch: refetchTeams } = useTeams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [transferTeamId, setTransferTeamId] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("");
  const [forceSellPriceInput, setForceSellPriceInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const usesFranchiseSchema = useMemo(() => {
    return teams.some((team) => Boolean(team.franchiseCode)) || players.some((player) => "assigned_franchise_code" in player.raw);
  }, [players, teams]);

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return players.filter((player) => !query || player.name.toLowerCase().includes(query));
  }, [players, searchQuery]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const isLoading = isPlayersLoading || isTeamsLoading;

  useEffect(() => {
    setSelectedPlayerId((currentId) => {
      if (players.some((player) => player.id === currentId)) return currentId;
      return players[0]?.id ?? "";
    });
  }, [players]);

  useEffect(() => {
    setBasePriceInput(selectedPlayer ? String(selectedPlayer.basePrice) : "");
    setForceSellPriceInput(selectedPlayer ? String(selectedPlayer.basePrice) : "");
  }, [selectedPlayer]);

  const refreshAll = async () => {
    await Promise.all([refetchPlayers(), refetchTeams()]);
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

  const getSelectedTeam = (teamId: string) => {
    return teams.find((team) => team.id === teamId) ?? null;
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
      ...(selectedPlayer && "status" in selectedPlayer.raw ? { status: "available" } : {}),
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

  const ensureTeamCanReceivePlayer = (team: AdminTeam | null, playerAlreadyAssigned = false, allowTransfer = false) => {
    if (!team) throw new Error("Select a team first.");
    if (team.isBlocked) throw new Error("Cannot assign to blocked team.");
    if (playerAlreadyAssigned && !allowTransfer) throw new Error("Cannot assign player already in another team.");
  };

  const assignToTeam = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    const team = getSelectedTeam(selectedTeamId);

    await runAction(async () => {
      ensureTeamCanReceivePlayer(team, Boolean(selectedPlayer.teamId), false);
      const soldPrice = selectedPlayer.basePrice;
      if ((team?.purse ?? 0) < soldPrice) throw new Error("Cannot reduce purse below 0.");

      const { error } = await supabase
        .from("players")
        .update(getPlayerAssignUpdate(team as AdminTeam, soldPrice))
        .eq("id", selectedPlayer.id);

      if (error) throw error;
      await updateTeamFinance(team as AdminTeam, -soldPrice, 1);
    }, `${selectedPlayer.name} assigned.`);
  };

  const transferPlayer = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    const currentTeam = teams.find((team) => team.assignmentId === selectedPlayer.teamId) ?? null;
    const targetTeam = getSelectedTeam(transferTeamId);

    if (!selectedPlayer.teamId) {
      setErrorMessage("Player is not currently assigned.");
      return;
    }

    if (selectedPlayer.teamId === targetTeam?.assignmentId) {
      setErrorMessage("Player is already assigned to that team.");
      return;
    }

    await runAction(async () => {
      ensureTeamCanReceivePlayer(targetTeam, true, true);
      if ((targetTeam?.purse ?? 0) < selectedPlayer.soldPrice) throw new Error("Cannot reduce purse below 0.");

      if (currentTeam) {
        await updateTeamFinance(currentTeam, selectedPlayer.soldPrice, -1);
      }

      await updateTeamFinance(targetTeam as AdminTeam, -selectedPlayer.soldPrice, 1);

      const { error } = await supabase
        .from("players")
        .update(getPlayerAssignUpdate(targetTeam as AdminTeam, selectedPlayer.soldPrice))
        .eq("id", selectedPlayer.id);

      if (error) throw error;
    }, `${selectedPlayer.name} transferred.`);
  };

  const removeFromTeam = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    const currentTeam = teams.find((team) => team.assignmentId === selectedPlayer.teamId) ?? null;

    await runAction(async () => {
      const { error } = await supabase.from("players").update(getPlayerClearUpdate()).eq("id", selectedPlayer.id);
      if (error) throw error;

      if (currentTeam) {
        await updateTeamFinance(currentTeam, selectedPlayer.soldPrice, -1);
      }
    }, `${selectedPlayer.name} removed from team.`);
  };

  const resetPlayer = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    const currentTeam = teams.find((team) => team.assignmentId === selectedPlayer.teamId) ?? null;

    await runAction(async () => {
      const clearUpdate = usesFranchiseSchema
        ? { ...getPlayerClearUpdate(), auction_status: "unsold" }
        : { ...getPlayerClearUpdate() };

      const { error } = await supabase.from("players").update(clearUpdate).eq("id", selectedPlayer.id);
      if (error) throw error;

      if (currentTeam) {
        await updateTeamFinance(currentTeam, selectedPlayer.soldPrice, -1);
      }
    }, `${selectedPlayer.name} reset.`);
  };

  const editBasePrice = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await runAction(async () => {
      const nextBasePrice = Number(basePriceInput);
      if (!Number.isFinite(nextBasePrice) || nextBasePrice < 0) throw new Error("Enter a valid base price.");

      const updatePayload = usesFranchiseSchema
        ? { base_price_lakhs: Math.round(nextBasePrice) }
        : { base_price: Math.round(nextBasePrice) };

      const { error } = await supabase.from("players").update(updatePayload).eq("id", selectedPlayer.id);
      if (error) throw error;
    }, "Base price updated.");
  };

  const forceSell = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    const team = getSelectedTeam(selectedTeamId);

    await runAction(async () => {
      ensureTeamCanReceivePlayer(team, false, true);
      if (selectedPlayer.teamId) {
        throw new Error("Cannot assign player already in another team.");
      }

      const soldPrice = Number(forceSellPriceInput);
      if (!Number.isFinite(soldPrice) || soldPrice < 0) throw new Error("Enter a valid force sell price.");
      if ((team?.purse ?? 0) < soldPrice) throw new Error("Cannot reduce purse below 0.");

      const { error } = await supabase
        .from("players")
        .update(getPlayerAssignUpdate(team as AdminTeam, Math.round(soldPrice)))
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      await updateTeamFinance(team as AdminTeam, -Math.round(soldPrice), selectedPlayer.teamId ? 0 : 1);
    }, `${selectedPlayer.name} force sold.`);
  };

  const addToAuction = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await runAction(async () => {
      const { data: auctionState, error: auctionStateError } = await supabase
        .from("auction_state")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (auctionStateError) throw auctionStateError;
      if (!auctionState?.id) throw new Error("No auction state row found.");

      const updatePayload: Record<string, unknown> = {
        current_player_id: selectedPlayer.id,
      };

      if ("current_bid_lakhs" in auctionState) {
        updatePayload.current_bid_lakhs = 0;
      }

      if ("current_bid" in auctionState) {
        updatePayload.current_bid = 0;
      }

      if ("current_winning_franchise_code" in auctionState) {
        updatePayload.current_winning_franchise_code = null;
      }

      if ("current_winning_bid_lakhs" in auctionState) {
        updatePayload.current_winning_bid_lakhs = 0;
      }

      if ("current_team_id" in auctionState) {
        updatePayload.current_team_id = null;
      }

      const { error } = await supabase.from("auction_state").update(updatePayload).eq("id", auctionState.id);
      if (error) throw error;
    }, `${selectedPlayer.name} added to auction.`);
  };

  return (
    <main className="min-h-screen bg-[#01070c] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/80 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
            Control Room
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Player Control Room
          </h1>
        </header>

        {errorMessage || playersError || teamsError ? (
          <section className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100">
            {errorMessage || playersError || teamsError}
          </section>
        ) : null}

        {message ? (
          <section className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-emerald-100">
            {message}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 text-cyan-100/70">
            Loading players...
          </section>
        ) : (
          <div className="flex gap-6">
            <PlayerList
              players={filteredPlayers}
              teams={teams}
              searchQuery={searchQuery}
              selectedPlayerId={selectedPlayerId}
              onSearchChange={setSearchQuery}
              onSelectPlayer={setSelectedPlayerId}
              formatMoney={formatLakhs}
            />
            <PlayerDetails
              player={selectedPlayer}
              teams={teams}
              selectedTeamId={selectedTeamId}
              transferTeamId={transferTeamId}
              basePriceInput={basePriceInput}
              forceSellPriceInput={forceSellPriceInput}
              isSaving={isSaving}
              onSelectedTeamChange={setSelectedTeamId}
              onTransferTeamChange={setTransferTeamId}
              onBasePriceInputChange={setBasePriceInput}
              onForceSellPriceInputChange={setForceSellPriceInput}
              onAssignToTeam={() => void assignToTeam()}
              onTransferPlayer={() => void transferPlayer()}
              onRemoveFromTeam={() => void removeFromTeam()}
              onResetPlayer={() => void resetPlayer()}
              onEditBasePrice={() => void editBasePrice()}
              onForceSell={() => void forceSell()}
              onAddToAuction={() => void addToAuction()}
              formatMoney={formatLakhs}
            />
          </div>
        )}
      </div>
    </main>
  );
}
