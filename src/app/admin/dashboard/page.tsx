import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="dashboard-shell">
      <div className="auth-topbar">
        <span className="badge">Auctioneer Console</span>
        <Link href="/" className="ghost-button">
          Exit
        </Link>
      </div>

      <section className="dashboard-card">
        <h1>Admin Dashboard</h1>
        <p>
          Supabase authentication is connected. Next step is adding player lots,
          bidding controls, and live room management.
        </p>
      </section>
    </main>
  );
}
