import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import { Gift, Sparkles, Calculator } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/format";
import { computeLoanStats } from "@/lib/penalty";



export const Route = createFileRoute("/_authenticated/share-out")({
  head: () => ({ meta: [{ title: "Share-out — Kijiji" }] }),
  component: ShareOutPage,
});

type MemberRow = {
  id: string;
  name: string;
  contributions: { amount: number }[] | null;
};

function ShareOutPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-shares", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, contributions(amount)")
        .order("name");
      if (error) throw error;
      return data as unknown as MemberRow[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["share-outs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_outs")
        .select("*, share_out_allocations(amount, member_id, members(name))")
        .order("share_out_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Raw contributions, loans and repayments for pool calc (mirrors portal logic).
  const { data: cycleData } = useQuery({
    queryKey: ["cycle-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, l, r] = await Promise.all([
        supabase
          .from("contributions")
          .select("member_id, amount, contribution_date, note"),
        supabase
          .from("loans")
          .select(
            "id, principal, interest_rate, penalty_rate, penalty_period_days, due_date, status",
          ),
        supabase.from("repayments").select("loan_id, amount, paid_date"),
      ]);
      if (c.error) throw c.error;
      if (l.error) throw l.error;
      if (r.error) throw r.error;
      return { contributions: c.data ?? [], loans: l.data ?? [], repayments: r.data ?? [] };
    },
  });

  const memberSavings = useMemo(() => {
    return (members ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      saved: (m.contributions ?? []).reduce((a, c) => a + Number(c.amount), 0),
    }));
  }, [members]);

  const totalSaved = memberSavings.reduce((a, m) => a + m.saved, 0);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"projected" | "actual" | "manual">("projected");
  const [pool, setPool] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const poolNum = Number(pool) || 0;

  // Mirrors portal.tsx pool math
  const repaysByLoan = useMemo(() => {
    const m = new Map<string, number>();
    (cycleData?.repayments ?? []).forEach((r: any) => {
      m.set(r.loan_id, (m.get(r.loan_id) ?? 0) + Number(r.amount));
    });
    return m;
  }, [cycleData]);

  const totalLent = (cycleData?.loans ?? []).reduce(
    (a: number, l: any) => a + Number(l.principal ?? 0),
    0,
  );
  const totalRepaid = (cycleData?.repayments ?? []).reduce(
    (a: number, r: any) => a + Number(r.amount ?? 0),
    0,
  );
  const availableFunds = Math.max(0, totalSaved - (totalLent - totalRepaid));

  const groupOutstanding = (cycleData?.loans ?? []).reduce((a: number, l: any) => {
    const repaid = repaysByLoan.get(l.id) ?? 0;
    return a + computeLoanStats(l, repaid).totalOwed;
  }, 0);
  const loanPenalties = (cycleData?.loans ?? []).reduce((a: number, l: any) => {
    const repaid = repaysByLoan.get(l.id) ?? 0;
    return a + computeLoanStats(l, repaid).penalty;
  }, 0);
  const appliedPenalties = (cycleData?.contributions ?? []).reduce(
    (total: number, c: any) => {
      const noteStr = String(c.note ?? "").toLowerCase();
      const amount = Number(c.amount);
      if (
        amount < 0 &&
        (noteStr.startsWith("offence penalty") ||
          noteStr.startsWith("inactivity penalty"))
      ) {
        return total + Math.abs(amount);
      }
      return total;
    },
    0,
  );
  const groupPenalties = loanPenalties + appliedPenalties;

  const projectedPool = availableFunds;
  const actualPool = groupOutstanding + availableFunds + groupPenalties;

  const cyclePool =
    mode === "actual" ? actualPool : mode === "projected" ? projectedPool : 0;

  const cycleRows = useMemo(() => {
    return memberSavings.map((m) => {
      const ratio = totalSaved > 0 ? m.saved / totalSaved : 0;
      return {
        id: m.id,
        name: m.name,
        contributions: m.saved,
        share: ratio * cyclePool,
      };
    });
  }, [memberSavings, totalSaved, cyclePool]);

  const manualRows = memberSavings.map((m) => ({
    ...m,
    share: totalSaved > 0 ? (m.saved / totalSaved) * poolNum : 0,
  }));

  const preview =
    mode === "manual"
      ? manualRows
      : cycleRows.map((r) => ({ id: r.id, name: r.name, share: r.share }));

  const totalToDistribute = mode === "manual" ? poolNum : cyclePool;


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (totalSaved <= 0) return toast.error("No savings to distribute");
    if (totalToDistribute <= 0)
      return toast.error(
        mode === "manual" ? "Enter a pool amount" : "Nothing to pay out yet",
      );

    const autoNote =
      mode === "projected"
        ? "Projected share-out (group balance distributed by savings ratio)"
        : mode === "actual"
          ? "Actual projected share-out (outstanding loans + group balance + penalties)"
          : null;

    const { data: so, error } = await supabase
      .from("share_outs")
      .insert({
        user_id: user.id,
        share_out_date: date,
        total_amount: Number(totalToDistribute.toFixed(2)),
        note: note || autoNote,
      })
      .select()
      .single();
    if (error || !so) return toast.error(error?.message ?? "Failed");

    const rows = preview
      .filter((p) => p.share > 0)
      .map((p) => ({
        user_id: user.id,
        share_out_id: so.id,
        member_id: p.id,
        amount: Number(p.share.toFixed(2)),
      }));
    if (rows.length) {
      const { error: aErr } = await supabase
        .from("share_out_allocations")
        .insert(rows);
      if (aErr) return toast.error(aErr.message);
    }

    toast.success("Share-out recorded");
    setOpen(false);
    setPool("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["share-outs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Share-out</h1>
          <p className="text-sm text-muted-foreground">
            Distribute the group's pool back to members in proportion to their savings.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              disabled={!memberSavings.length || totalSaved <= 0}
            >
              <Gift className="h-4 w-4" /> New share-out
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New share-out</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
                {(["projected", "actual", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition ${
                      mode === m ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {m === "projected"
                      ? "Projected"
                      : m === "actual"
                        ? "Actual projected"
                        : "Manual"}
                  </button>
                ))}
              </div>

              {mode === "projected" ? (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Group balance ({money(projectedPool)} = savings −
                  outstanding loan principal) split by each member's savings
                  ratio.
                </div>
              ) : mode === "actual" ? (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Actual pool ({money(actualPool)} = outstanding loans owed +
                  group balance + penalties) split by each member's savings
                  ratio.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                {mode === "manual" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="pool">Pool to distribute</Label>
                    <Input
                      id="pool"
                      type="number"
                      min="0"
                      step="0.01"
                      required={mode === "manual"}
                      value={pool}
                      onChange={(e) => setPool(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Total payout</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 font-display tabular-nums text-primary">
                      {money(totalToDistribute)}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="dt">Date</Label>
                  <Input
                    id="dt"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt">Note (optional)</Label>
                <Textarea
                  id="nt"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {mode === "cycle" ? (
                    <Calculator className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Preview
                </div>
                {mode === "cycle" ? (
                  <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                    {cycleRows.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(p.contributions)} saved
                            {p.profit > 0 ? ` + ${money(p.profit)} profit` : ""}
                          </p>
                        </div>
                        <span className="font-display tabular-nums text-primary">
                          {money(p.share)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                    {manualRows.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-display tabular-nums text-primary">
                          {money(p.share)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" className="gap-2">
                  <Gift className="h-4 w-4" /> Record share-out
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Group balance
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
            {money(groupBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Savings {money(totalSaved)} − outstanding loans {money(outstanding)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Past share-outs
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
            {history?.length ?? 0}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">History</h2>
        {!history || history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No share-outs yet.
          </p>
        ) : (
          <div className="space-y-5">
            {history.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{fmtDate(s.share_out_date)}</p>
                    {s.note && (
                      <p className="text-xs text-muted-foreground">{s.note}</p>
                    )}
                  </div>
                  <span className="font-display tabular-nums text-primary">
                    {money(s.total_amount)}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {(s.share_out_allocations ?? []).map((a: any, i: number) => (
                    <li key={i} className="flex justify-between py-1.5">
                      <span>{a.members?.name ?? "—"}</span>
                      <span className="font-display tabular-nums">
                        {money(a.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}