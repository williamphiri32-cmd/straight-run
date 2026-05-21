import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { PaymentMethodSelect, type PaymentMethod } from "@/components/payment-method-select";
import { HandCoins, TrendingUp, AlertTriangle, Gift, Clock, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/format";
import { computeLoanStats, projectShareOut } from "@/lib/penalty";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "My Portal — Kijiji" }] }),
  component: PortalPage,
});

function PortalPage() {
  const { user } = useAuth();
  const { isMember, linkedMembers, loading } = useRole();
  const me = linkedMembers[0]; // primary linked member
  const groupId = me?.user_id;

  const { data: portal } = useQuery({
    queryKey: ["portal", user?.id, me?.id],
    enabled: !!me && !!groupId,
    queryFn: async () => {
      const [contribsRes, loansRes, repaysRes, appsRes, allocRes, allMembersRes, settingsRes, limitRes] =
        await Promise.all([
          supabase.from("contributions").select("*").eq("user_id", groupId!),
          supabase.from("loans").select("*").eq("user_id", groupId!),
          supabase.from("repayments").select("*").eq("user_id", groupId!),
          supabase
            .from("loan_applications")
            .select("*")
            .eq("user_id", groupId!)
            .order("created_at", { ascending: false }),
          supabase.from("share_out_allocations").select("*").eq("user_id", groupId!),
          supabase.from("members").select("id, name").eq("user_id", groupId!),
          supabase.from("group_settings").select("default_max_tenure_months").eq("user_id", groupId!).maybeSingle(),
          supabase.from("member_loan_limits").select("max_tenure_months").eq("user_id", groupId!).eq("member_id", me!.id).maybeSingle(),
        ]);
      return {
        contributions: contribsRes.data ?? [],
        loans: loansRes.data ?? [],
        repayments: repaysRes.data ?? [],
        applications: appsRes.data ?? [],
        allocations: allocRes.data ?? [],
        allMembers: allMembersRes.data ?? [],
        maxTenure:
          limitRes.data?.max_tenure_months ??
          settingsRes.data?.default_max_tenure_months ??
          12,
      };
    },
  });

  const stats = useMemo(() => {
    if (!portal || !me) return null;
    const mySavings = portal.contributions
      .filter((c: any) => c.member_id === me.id)
      .reduce((a, c: any) => a + Number(c.amount), 0);
    const groupSavings = portal.contributions.reduce(
      (a, c: any) => a + Number(c.amount),
      0,
    );
    const firstContrib = portal.contributions
      .filter((c: any) => c.member_id === me.id)
      .reduce<string | null>((min, c: any) => {
        if (!min || c.contribution_date < min) return c.contribution_date;
        return min;
      }, null);
    const months = firstContrib
      ? Math.max(
          1,
          Math.ceil(
            (Date.now() - new Date(firstContrib).getTime()) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        )
      : 0;

    const myLoans = portal.loans.filter((l: any) => l.member_id === me.id);
    const repaysByLoan = new Map<string, number>();
    portal.repayments.forEach((r: any) => {
      repaysByLoan.set(
        r.loan_id,
        (repaysByLoan.get(r.loan_id) ?? 0) + Number(r.amount),
      );
    });
    const loansWithStats = myLoans.map((l: any) => ({
      loan: l,
      stats: computeLoanStats(l, repaysByLoan.get(l.id) ?? 0),
    }));
    const outstanding = loansWithStats.reduce(
      (a, x) => a + x.stats.totalOwed,
      0,
    );
    const totalPenalties = loansWithStats.reduce(
      (a, x) => a + x.stats.penalty,
      0,
    );

    // crude projected share-out: assume pool = remaining group savings - outstanding loans
    const groupOutstanding = portal.loans.reduce((a, l: any) => {
      const repaid = repaysByLoan.get(l.id) ?? 0;
      return a + computeLoanStats(l, repaid).totalOwed;
    }, 0);
    const projectedPool = Math.max(0, groupSavings + groupOutstanding * 0); // pool = savings (loans count as receivable)
    const projectedShare = projectShareOut(mySavings, groupSavings, projectedPool);

    // Available funds for new loans = group savings - outstanding owed - pending application amounts
    const pendingApplied = portal.applications
      .filter((a: any) => a.status === "pending")
      .reduce((a, x: any) => a + Number(x.amount), 0);
    const availableFunds = Math.max(0, groupSavings - groupOutstanding - pendingApplied);

    return {
      mySavings,
      groupSavings,
      months,
      loansWithStats,
      outstanding,
      totalPenalties,
      projectedShare,
      availableFunds,
    };
  }, [portal, me]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isMember || !me) {
    return (
      <Card className="p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">No member account linked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn't linked to a member record yet. Ask your treasurer to
          add you with the email <strong>{user?.email}</strong>.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Welcome, {me.name}</h1>
        <p className="text-sm text-muted-foreground">
          Your savings, loans, and projected share-out at a glance.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="My savings"
          value={money(stats?.mySavings ?? 0)}
          hint={stats?.months ? `${stats.months} mo contributing` : "Not started"}
        />
        <StatCard
          icon={<HandCoins className="h-4 w-4" />}
          label="Outstanding loans"
          value={money(stats?.outstanding ?? 0)}
          hint={`${stats?.loansWithStats.filter((x) => !x.stats.fullyPaid).length ?? 0} active`}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Penalties accrued"
          value={money(stats?.totalPenalties ?? 0)}
          hint={stats?.totalPenalties ? "Pay down to stop accrual" : "None"}
          tone={stats?.totalPenalties ? "warn" : "default"}
        />
        <StatCard
          icon={<Gift className="h-4 w-4" />}
          label="Projected share-out"
          value={money(stats?.projectedShare ?? 0)}
          hint="If pool = group savings"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ContributeCard memberId={me.id} groupId={me.user_id} mySavings={stats?.mySavings ?? 0} groupSavings={stats?.groupSavings ?? 0} />
        <ApplyForLoanCard memberId={me.id} groupId={me.user_id} availableFunds={stats?.availableFunds ?? 0} maxTenure={portal?.maxTenure ?? 12} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold">My loans</h2>
        {!stats?.loansWithStats.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No loans yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {stats.loansWithStats.map(({ loan, stats: s }) => (
              <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{money(s.principal)} principal</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {fmtDate(loan.issued_date)} · {Number(loan.interest_rate)}% interest
                    {loan.due_date ? ` · due ${fmtDate(loan.due_date)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {s.isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      <Clock className="h-3 w-3" /> {s.daysOverdue}d overdue
                    </span>
                  )}
                  {s.penalty > 0 && (
                    <span className="text-xs text-destructive">
                      +{money(s.penalty)} penalty
                    </span>
                  )}
                  <span className="font-display tabular-nums text-primary">
                    {money(s.totalOwed)} owed
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold">My applications</h2>
        {!portal?.applications.filter((a: any) => a.member_id === me.id).length ? (
          <p className="mt-2 text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {portal!.applications
              .filter((a: any) => a.member_id === me.id)
              .map((a: any) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">{money(a.amount)} · {a.term_months} mo</p>
                    <p className="text-xs text-muted-foreground">
                      {a.purpose ?? "—"} · {fmtDate(a.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={`mt-2 font-display text-xl tabular-nums break-all sm:text-2xl ${
          tone === "warn" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-accent/30 text-accent-foreground",
    approved: "bg-primary/15 text-primary",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
        map[status] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function ApplyForLoanCard({ memberId, groupId, availableFunds, maxTenure }: { memberId: string; groupId: string; availableFunds: number; maxTenure: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("3");
  const [purpose, setPurpose] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    const termNum = Number(term);
    if (!paymentMethod) {
      toast.error("Select a payment method");
      return;
    }
    if (termNum > maxTenure) {
      toast.error(`Max loan tenure for you is ${maxTenure} months`);
      return;
    }
    if (amt > availableFunds) {
      setOpen(false);
      setInsufficientOpen(true);
      return;
    }
    const { error } = await supabase.from("loan_applications").insert({
      user_id: groupId,
      member_id: memberId,
      amount: amt,
      term_months: Number(term),
      purpose: purpose || null,
      payment_method: paymentMethod,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Application submitted");
    setOpen(false);
    setAmount("");
    setTerm("3");
    setPurpose("");
    setPaymentMethod("");
    qc.invalidateQueries({ queryKey: ["portal"] });
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-accent/10 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Need a loan?</h2>
        <p className="text-sm text-muted-foreground">
          Submit an application. Available group funds:{" "}
          <strong className="text-foreground">{money(availableFunds)}</strong>
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <HandCoins className="h-4 w-4" /> Apply for loan
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New loan application</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a">Amount</Label>
                <Input id="a" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Max available: {money(availableFunds)}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t">Term (months)</Label>
                <Input id="t" type="number" min="1" max={maxTenure} required value={term} onChange={(e) => setTerm(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Max tenure: {maxTenure} months</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Purpose</Label>
              <Textarea id="p" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is this loan for?" />
            </div>
            <DialogFooter>
              <Button type="submit">Submit application</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={insufficientOpen} onOpenChange={setInsufficientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Not enough funds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Your group doesn't have enough available funds to cover this loan.
            </p>
            <div className="rounded-md bg-muted p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested</span>
                <span className="font-medium tabular-nums">{money(Number(amount) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium tabular-nums">{money(availableFunds)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Available funds = total contributions − outstanding loans − pending applications.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsufficientOpen(false)}>Close</Button>
            <Button onClick={() => { setInsufficientOpen(false); setOpen(true); }}>Adjust amount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ContributeCard({ memberId, groupId, mySavings, groupSavings }: { memberId: string; groupId: string; mySavings: number; groupSavings: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > 10_000_000) return toast.error("Amount too large");
    if (!paymentMethod) return toast.error("Select a payment method");
    setSubmitting(true);
    const { error } = await supabase.from("contributions").insert({
      user_id: groupId,
      member_id: memberId,
      amount: amt,
      note: note.trim() ? note.trim().slice(0, 500) : null,
      payment_method: paymentMethod,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Contribution recorded");
    setOpen(false);
    setAmount("");
    setNote("");
    setPaymentMethod("");
    qc.invalidateQueries({ queryKey: ["portal"] });
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-accent/15 to-primary/10 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Contribute to savings</h2>
        <p className="text-sm text-muted-foreground">
          Add to your cumulative savings in the group.
        </p>
        <p className="mt-2 text-sm">
          Total saved: <strong className="font-display tabular-nums text-foreground">{money(mySavings)}</strong>
        </p>
        <p className="text-sm">
          Group total: <strong className="font-display tabular-nums text-foreground">{money(groupSavings)}</strong>
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="gap-2">
            <PiggyBank className="h-4 w-4" /> Contribute
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New contribution</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-amount">Amount</Label>
              <Input
                id="c-amount"
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-note">Note (optional)</Label>
              <Textarea
                id="c-note"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Monthly savings for May"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save contribution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
