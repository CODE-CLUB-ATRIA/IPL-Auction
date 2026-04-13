'use client';

import { useEffect, useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the live auction feed.";
};

const fetchAuctionState = async (): Promise<AuctionStateRow | null> => {
  const { data, error } = await supabase.from("auction_state").select("*").limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAuctionStateRow(data as Record<string, unknown>) : null;
};

const fetchPlayer = async (playerId: string | null, auctionState: AuctionStateRow | null): Promise<Player | null> => {
  if (!playerId) {
    return null;
  }

  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPlayerRow(data as PlayerRow, auctionState) : null;
};

export default function AuctioneerOnePage() {
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncAuctionState = async (nextAuctionState: AuctionStateRow | null) => {
      if (!isMounted) {
        return;
      }

      setAuctionState(nextAuctionState);

      if (!nextAuctionState?.current_player_id) {
        setActivePlayer(null);
        return;
      }

      const nextPlayer = await fetchPlayer(nextAuctionState.current_player_id, nextAuctionState);

      if (isMounted) {
        setActivePlayer(nextPlayer);
      }
    };

    const loadAuctionFeed = async () => {
      try {
        const initialAuctionState = await fetchAuctionState();
        setErrorMessage("");
        await syncAuctionState(initialAuctionState);
      } catch (error) {
        if (isMounted) {
          setAuctionState(null);
          setActivePlayer(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAuctionFeed();

    const channel = supabase
      .channel("auction_state_changes_display")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auction_state",
        },
        async (payload) => {
          try {
            const nextAuctionState = mapAuctionStateRow(payload.new as Record<string, unknown>);
            setErrorMessage("");
            await syncAuctionState(nextAuctionState);
          } catch (error) {
            if (isMounted) {
              setErrorMessage(getErrorMessage(error));
            }
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="grid min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(200,163,79,0.2),_transparent_24%),linear-gradient(180deg,#06162f_0%,#0a2447_100%)] px-4 py-5 text-[#fdfbf7] sm:px-8 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl place-items-center">
        <div className="grid w-full gap-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.5em] text-[#d4b467]">Auctioneer 1</p>
            <h1 className="mt-4 font-display text-5xl leading-none sm:text-6xl lg:text-7xl">Arena Display</h1>
            <p className="mt-4 text-sm uppercase tracking-[0.32em] text-[#d4ddef]">
              Live auction feed mirrored from Supabase in realtime
            </p>
          </header>

          {errorMessage ? (
            <section className="rounded-[2rem] border border-[#d9a0a0] bg-[#5f1111]/35 px-6 py-5 text-center text-sm uppercase tracking-[0.22em] text-[#ffe1e1]">
              {errorMessage}
            </section>
          ) : null}

          {isLoading ? (
            <section className="grid min-h-[65vh] place-items-center rounded-[2.4rem] border border-white/12 bg-white/5 px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#d4b467]">Connecting</p>
                <h2 className="mt-6 font-display text-4xl leading-none sm:text-5xl">Loading the live auction board</h2>
              </div>
            </section>
          ) : activePlayer && auctionState ? (
            <div className="grid place-items-center">
              <PlayerCard player={activePlayer} className="w-full max-w-6xl" />
            </div>
          ) : (
            <section className="grid min-h-[65vh] place-items-center rounded-[2.4rem] border border-white/12 bg-white/5 px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#d4b467]">Waiting for Controller</p>
                <h2 className="mt-6 font-display text-4xl leading-none sm:text-5xl">Open Auctioneer 2 to start the live board</h2>
                <p className="mt-5 text-sm uppercase tracking-[0.24em] text-[#d4ddef]">
                  This screen updates instantly whenever the controller changes the live player, bid, or auction status.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
