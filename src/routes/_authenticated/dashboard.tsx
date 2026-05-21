import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users, Banknote, PiggyBank, Wallet, AlertTriangle } from "lucide-react";
import { money, fmtDate } from "@/lib/format";
import { computeLoanStats } from "@/lib/penalty";

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
        supabase.from("loans").select("id, principal, status, member_id, issued_date, due_date, interest_rate, penalty_rate, penalty_period_days"),
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

      const repaidByLoan = new Map<string, number>();
      for (const r of repays.data ?? []) {
        const id = r.loan_id as string;
        repaidByLoan.set(id, (repaidByLoan.get(id) ?? 0) + Number(r.amount));
      }
      let totalPenalties = 0;
      for (const loan of loans.data ?? []) {
        if (loan.status === "paid") continue;
        const repaid = repaidByLoan.get(loan.id) ?? 0;
        const stats = computeLoanStats(loan, repaid);
        totalPenalties += stats.penalty;
      }

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
        totalPenalties,
        memberCount: totalMembers,
        totalSavings,
        outstanding,
        balance,
        activeLoans,
        recent,
        contributedCount,
        notContributedCount: totalMembers - contributedCount,
        contributedMembers: members.data
          ?.filter((m: any) => memberIdsWithContribThisMonth.has(m.id))
          .map((m: any) => m.name as string) ?? [],
        notContributedMembers: members.data
          ?.filter((m: any) => !memberIdsWithContribThisMonth.has(m.id))
          .map((m: any) => m.name as string) ?? [],
      };
    },
  });

  const stats = [
    { label: "Group balance", value: money(data?.balance), icon: Wallet, hl: true },
    {
      label: "Total savings",
      value: money(data?.totalSavings),
      icon: PiggyBank,
      sub:
        data != null
          ? `${data.contributedCount} contributed · ${data.notContributedCount} not contributed`
          : undefined,
    },
    { label: "Outstanding loans", value: money(data?.outstanding), icon: Banknote },
    { label: "Penalties", value: money(data?.totalPenalties), icon: AlertTriangle },
    { label: "Members", value: String(data?.memberCount ?? 0), icon: Users },
  ];

  const [showContrib, setShowContrib] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of your group's books.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, hl, sub }) => (
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
            <p className={`font-display text-xl font-semibold tabular-nums break-all sm:text-2xl ${sub ? "mt-2" : "mt-3"}`}>
              {value}
            </p>
            {sub && (
              <button
                onClick={() => setShowContrib(true)}
                className={`mt-1 text-xs cursor-pointer underline hover:no-underline ${hl ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {sub}
              </button>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={showContrib} onOpenChange={setShowContrib}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contributions this month</DialogTitle>
            <DialogDescription>
              Members who contributed and those who have not.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <h4 className="text-sm font-medium mb-2">
                Contributed ({data?.contributedCount ?? 0})
              </h4>
              {data && data.contributedMembers.length > 0 ? (
                <ul className="space-y-1">
                  {data.contributedMembers.map((name) => (
                    <li key={name} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No contributions yet.</p>
              )}
            </div>
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">
                Not contributed ({data?.notContributedCount ?? 0})
              </h4>
              {data && data.notContributedMembers.length > 0 ? (
                <ul className="space-y-1">
                  {data.notContributedMembers.map((name) => (
                    <li key={name} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">All members contributed.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
