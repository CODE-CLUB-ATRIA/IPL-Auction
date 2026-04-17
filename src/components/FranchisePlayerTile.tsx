/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { Player } from "@/types/player";

type FranchisePlayerTileTheme = {
  accent: string;
  accentSoft: string;
  surface: string;
  border: string;
  text: string;
  mutedText: string;
};

interface FranchisePlayerTileProps {
  player: Player;
  theme: FranchisePlayerTileTheme;
  isSelected?: boolean;
  strategyIndex?: number;
  onClick?: () => void;
}

const formatLakhs = (amount: number): string => {
  if (!amount) return "Rs 0 L";
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `Rs ${amount} L`;
};

const getDisplayImage = (player: Player): string => {
  return (
    player.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=ffffff&color=111111&size=512&bold=true`
  );
};

export default function FranchisePlayerTile({
  player,
  theme,
  onClick,
}: FranchisePlayerTileProps) {
  const style = {
    ["--tile-accent" as string]: theme.accent,
    ["--tile-accent-soft" as string]: theme.accentSoft,
    ["--tile-surface" as string]: theme.surface,
    ["--tile-border" as string]: theme.border,
    ["--tile-text" as string]: theme.text,
    ["--tile-muted" as string]: theme.mutedText,
  } as CSSProperties;

  const content = (
    <>
      <div className="franchise-player-tile__avatar">
        <img src={getDisplayImage(player)} alt={player.name} />
      </div>

      <div className="franchise-player-tile__body">
        <p className="franchise-player-tile__role">{player.role}</p>
        <h3>{player.name}</h3>
        <div className="franchise-player-tile__details">
          <div>
            <span>Base Price</span>
            <strong>{formatLakhs(player.basePriceLakhs)}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{player.role}</strong>
          </div>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="franchise-player-tile franchise-player-tile--button" style={style}>
        {content}
      </button>
    );
  }

  return (
    <article className="franchise-player-tile" style={style}>
      {content}
    </article>
  );
}