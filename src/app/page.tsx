import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <span className="logo-text">IPL Auction Arena</span>
        <span className="rules-pill">Rules</span>
      </nav>

      <section className="hero-panel">
        <h1>
          Welcome to Cricket
          <br />
          Auction Arena
        </h1>

        <div className="hero-divider">
          <span />
          <strong>◆</strong>
          <span />
        </div>

        <div className="cta-grid">
          <Link href="/admin/login" className="primary-button landing-cta">
            Auctioneer Login
          </Link>
          <Link href="/franchise/login" className="primary-button landing-cta secondary">
            Franchise Login
          </Link>
        </div>
      </section>
    </main>
  );
}
