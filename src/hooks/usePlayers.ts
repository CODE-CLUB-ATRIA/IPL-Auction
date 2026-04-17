"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type AdminPlayer = {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  teamId: string | null;
  soldPrice: number;
  isSold: boolean;
  raw: Record<string, unknown>;
};

const readString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
  return 0;
};

const getValue = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (key in row) return row[key];
  }
  return undefined;
};

const mapPlayer = (row: Record<string, unknown>): AdminPlayer => {
  const teamId = readString(getValue(row, "team_id", "assigned_franchise_code")) || null;
  const basePrice = readNumber(getValue(row, "base_price", "base_price_lakhs"));
  const soldPrice = readNumber(getValue(row, "sold_price", "current_bid_lakhs"));

  return {
    id: readString(row.id),
    name: readString(row.name) || "Unnamed Player",
    role: readString(row.role) || "Player",
    basePrice,
    teamId,
    soldPrice,
    isSold: Boolean(getValue(row, "is_sold")) || readString(getValue(row, "auction_status")) === "sold" || Boolean(teamId),
    raw: row,
  };
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load players.";
};

export const usePlayers = () => {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("players").select("*").order("name", { ascending: true });

    if (error) throw error;

    setPlayers(((data ?? []) as Record<string, unknown>[]).map(mapPlayer));
    setErrorMessage("");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPlayers = async () => {
      try {
        await refetch();
      } catch (error) {
        if (isMounted) {
          setPlayers([]);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPlayers();

    const channel = supabase
      .channel("admin_players_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        void loadPlayers();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { players, isLoading, errorMessage, refetch };
};
