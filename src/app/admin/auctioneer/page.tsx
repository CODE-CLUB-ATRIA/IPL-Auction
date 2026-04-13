"use client";

import Link from "next/link";
import { useState } from "react";

type AuctionPlayer = {
  name: string;
  role: string;
  basePrice: string;
  currentBid: string;
  creditPoint: number;
  stats: { label: string; value: string }[];
};

const AUCTION_PLAYERS: AuctionPlayer[] = [
  {
    name: "Dhruv Jurel",
    role: "Wicket-Keeper",
    basePrice: "₹5L",
    currentBid: "₹5L",
    creditPoint: 98,
    stats: [
      { label: "Highest Score", value: "81" },
      { label: "Most Runs", value: "200" },
      { label: "Matches", value: "4" },
      { label: "Average", value: "50" },
      { label: "Strike Rate", value: "266.66" },
    ],
  },
  {
    name: "Vaibhav Sooryavanshi",
    role: "Batsman",
    basePrice: "₹10L",
    currentBid: "₹10L",
    creditPoint: 96,
    stats: [
      { label: "Highest Score", value: "74" },
      { label: "Most Runs", value: "188" },
      { label: "Matches", value: "5" },
      { label: "Average", value: "47" },
      { label: "Strike Rate", value: "201.45" },
    ],
  },
];

export default function AuctioneerPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBidStarted, setIsBidStarted] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);

  const player = AUCTION_PLAYERS[currentIndex];

  function handleNextPlayer() {
    setCurrentIndex((previous) => (previous + 1) % AUCTION_PLAYERS.length);
    setIsBidStarted(false);
    setIsSoldOut(false);
  }

  return (
    <main className="dashboard-shell auctioneer-shell">
      <div className="admin-topbar">
        <div className="admin-branding">
          <span className="brand-dots" aria-hidden>
            ●●●
          </span>
          <span>Cricket Auction Arena</span>
        </div>

        <div className="admin-actions">
          <button className="sketch-button" type="button">
            Admin
          </button>
          <Link href="/" className="sketch-button logout-link">
            LOGOUT
          </Link>
        </div>
      </div>

      <section className="auctioneer-layout">
        <section className="auctioneer-main-panel">
          <div className="auctioneer-hero-grid">
            <article className="auctioneer-player-image">
              <span>Player Image</span>
            </article>

            <article className="auctioneer-stats-preview">
              <h2>STATS/*</h2>
              <div className="auctioneer-highlight-row">
                <span>{player.stats[0].value}</span>
                <p>{player.stats[0].label}</p>
                <strong>{player.name}</strong>
              </div>
            </article>
          </div>

          <div className="auctioneer-meta-row">
            <article>
              <p>Player Name</p>
              <strong>{player.name}</strong>
              <small>Role: {player.role}</small>
            </article>
            <article>
              <p>Base Price</p>
              <strong>{player.basePrice}</strong>
            </article>
            <article>
              <p>Credit Point</p>
              <strong>{player.creditPoint}</strong>
            </article>
          </div>
        </section>

        <aside className="auctioneer-side-panel">
          <h3>Mark Sold To:</h3>
          <div className="auctioneer-team-bids">
            <div>
              <span>#Team Name</span>
              <span>Current Bid</span>
            </div>
            <div>
              <span>#Team Name</span>
              <span>Current Bid</span>
            </div>
            <div>
              <span>#Team Name</span>
              <span>Current Bid</span>
            </div>
            <div>
              <span>#Team Name</span>
              <span>Current Bid</span>
            </div>
          </div>

          <section className="auction-controls">
            <h4>AUCTION CONTROLS</h4>
            <button
              type="button"
              className={`ghost-button ${isSoldOut ? "active-action" : ""}`}
              onClick={() => setIsSoldOut((previous) => !previous)}
            >
              {isSoldOut ? "Marked Sold" : "Sold Out"}
            </button>
            <button
              type="button"
              className={`primary-button ${isBidStarted ? "active-action" : ""}`}
              onClick={() => setIsBidStarted((previous) => !previous)}
            >
              {isBidStarted ? "Bidding Running" : "Start Bid"}
            </button>
            <button type="button" className="ghost-button" onClick={handleNextPlayer}>
              Next Player
            </button>
          </section>
        </aside>
      </section>

      <section className="auctioneer-stats-card">
        <div className="player-stat-banner">
          <span>{player.stats[1].value}</span>
          <p>{player.stats[1].label}</p>
          <strong>{player.name}</strong>
        </div>
        <div className="player-stat-grid">
          {player.stats.slice(2).map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
