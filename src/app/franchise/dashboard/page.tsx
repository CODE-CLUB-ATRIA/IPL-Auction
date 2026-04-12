import Link from "next/link";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";

type FranchiseDashboardProps = {
  searchParams: Promise<{ team?: FranchiseCode }>;
};

export default async function FranchiseDashboardPage({
  searchParams,
}: FranchiseDashboardProps) {
  const { team } = await searchParams;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;

  return (
    <main className="dashboard-shell">
      <div className="auth-topbar">
        <span className="badge">
          {franchise ? `${franchise.code} War Room` : "Franchise Dashboard"}
        </span>
        <Link href="/franchise/login" className="ghost-button">
          Switch Team
        </Link>
      </div>

      <section className="dashboard-card">
        <h1>{franchise ? franchise.name : "Franchise Dashboard"}</h1>
        <p>
          {franchise
            ? `Welcome ${franchise.city}. You are ready for the live auction room.`
            : "Please login from the franchise screen to access your team dashboard."}
        </p>
      </section>
    </main>
  );
}
