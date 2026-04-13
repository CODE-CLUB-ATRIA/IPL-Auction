export type AuctionStatus = "unsold" | "bidding" | "sold";

export interface PlayerStats {
  matches: number;
  highestScore?: number;
  runs?: number;
  wickets?: number;
  strikeRate: number;
  average: number;
}

export interface Player {
  id: string;
  slNo: number | null;
  name: string;
  role: string;
  category: string;
  country: string;
  teams: string;
  imageUrl: string;
  basePriceLakhs: number;
  currentBidLakhs: number;
  lastBidderId: string | null;
  status: AuctionStatus;
  stats: PlayerStats;
}

export interface AuctionStateRow {
  id: string;
  current_player_id: string | null;
  current_bid: number;
  status: AuctionStatus;
}

export type PlayerRow = Record<string, unknown>;
