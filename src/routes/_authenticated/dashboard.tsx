import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Users, Banknote, PiggyBank, Wallet } from "lucide-react";
import { money, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — Kijiji" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [members, contribs, loans, repays] = await Promise.all([
        supabase.from("members").select("id, name"),
        supabase.from("contributions").select("amount, contribution_date, member_id, note"),
        supabase.from("loans").select("id, principal, status, member_id, issued_date"),
        supabase.from("repayments").select("amount, paid_date, loan_id"),
      ]);
      const memberName = new Map(
        (members.data ?? []).map((m: any) => [m.id, m.name as string]),
      );
      const loanMember = new Map(
        (loans.data ?? []).map((l: any) => [l.id, l.member_id as string]),
      );
      const sum = (rows: any[] | null, k = "amount") =>
        (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
      const totalSavings = sum(contribs.data);
      const totalLent = (loans.data ?? []).reduce((a, r) => a + Number(r.principal), 0);
      const totalRepaid = sum(repays.data);
      const outstanding = totalLent - totalRepaid;
      const balance = totalSavings - outstanding;
      const activeLoans = (loans.data ?? []).filter((l) => l.status !== "paid").length;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const memberIdsWithContribThisMonth = new Set(
        (contribs.data ?? [])
          .filter((c: any) => {
            const d = new Date(c.contribution_date);
            return d >= monthStart && d < monthEnd;
          })
          .map((c: any) => c.member_id),
      );
      const totalMembers = (members.data ?? []).length;
      const contributedCount = memberIdsWithContribThisMonth.size;

      const recent = [
        ...(contribs.data ?? []).map((c: any) => ({
          kind: "Contribution",
          date: c.contribution_date,
          amount: Number(c.amount),
          note: c.note,
          who: memberName.get(c.member_id) ?? null,
        })),
        ...(repays.data ?? []).map((r: any) => ({
          kind: "Repayment",
          date: r.paid_date,
          amount: Number(r.amount),
          who: memberName.get(loanMember.get(r.loan_id) ?? "") ?? null,
        })),
      ]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6);
      return {
        memberCount: totalMembers,
        totalSavings,
        outstanding,
        balance,
        activeLoans,
        recent,
        contributedCount,
        notContributedCount: totalMembers - contributedCount,
      };
    },
  });

  const stats = [
    { label: "Group balance", value: money(data?.balance), icon: Wallet, hl: true },
    { label: "Total savings", value: money(data?.totalSavings), icon: PiggyBank },
    { label: "Outstanding loans", value: money(data?.outstanding), icon: Banknote },
    { label: "Members", value: String(data?.memberCount ?? 0), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of your group's books.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hl }) => (
          <Card
            key={label}
            className={`p-5 ${hl ? "bg-primary text-primary-foreground" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider ${hl ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {label}
              </span>
              <Icon className={`h-4 w-4 ${hl ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <p className="mt-3 font-display text-xl font-semibold tabular-nums break-all sm:text-2xl">
              {value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          <span className="text-xs text-muted-foreground">
            {data?.activeLoans ?? 0} active loan{(data?.activeLoans ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
        {(!data || data.recent.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity yet. Add a member to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.who ? `${r.who} · ${r.kind}` : r.kind}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.date)}</p>
                </div>
                <span className="font-display tabular-nums text-primary">
                  + {money(r.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
