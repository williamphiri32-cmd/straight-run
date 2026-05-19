import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Banknote, Plus, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Loans — Kijiji" }] }),
  component: LoansPage,
});

function LoansPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-min", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["group-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_settings")
        .select("default_interest_rate, default_penalty_rate")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: loans } = useQuery({
    queryKey: ["loans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, members(name), repayments(amount)")
        .order("issued_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["group-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, l, r] = await Promise.all([
        supabase.from("contributions").select("amount").eq("user_id", user!.id),
        supabase.from("loans").select("principal").eq("user_id", user!.id),
        supabase.from("repayments").select("amount").eq("user_id", user!.id),
      ]);
      const sum = (rows: any[] | null) =>
        (rows ?? []).reduce((a, x) => a + Number(x.amount ?? x.principal ?? 0), 0);
      return sum(c.data) + sum(r.data) - sum(l.data);
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["loan-applications-on-loans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [appsRes, membersRes] = await Promise.all([
        supabase
          .from("loan_applications")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("members").select("id, name"),
      ]);
      const nameMap = new Map(
        (membersRes.data ?? []).map((m: any) => [m.id, m.name]),
      );
      return (appsRes.data ?? []).map((a: any) => ({
        ...a,
        member_name: nameMap.get(a.member_id) ?? "—",
      }));
    },
  });

  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("0");
  const [dueDate, setDueDate] = useState("");

  // Sync interest default from group settings
  useEffect(() => {
    if (settings?.default_interest_rate != null) {
      setRate(String(settings.default_interest_rate));
    }
  }, [settings?.default_interest_rate]);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !memberId) return;
    const { error } = await supabase.from("loans").insert({
      user_id: user.id,
      member_id: memberId,
      principal: Number(principal),
      interest_rate: Number(rate),
      penalty_rate: Number(settings?.default_penalty_rate ?? 5) / 100,
      due_date: dueDate || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Loan issued");
    setOpen(false);
    setMemberId(""); setPrincipal(""); setDueDate("");
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">
            Track who borrowed, what's owed, and what's been repaid.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!members || members.length === 0}>
              <Banknote className="h-4 w-4" /> Issue loan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New loan</DialogTitle>
            </DialogHeader>
            <form onSubmit={issue} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                  <SelectContent>
                    {(members ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pr">Principal</Label>
                  <Input id="pr" type="number" min="0" step="0.01" required value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r">Interest %</Label>
                  <Input id="r" type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d">Due date (optional)</Label>
                <Input id="d" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit">Issue loan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {applications && applications.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Loan applications · {applications.length}
          </h2>
          <Card className="divide-y">
            {applications.map((a: any) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">
                    {a.member_name} · {money(a.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(a.created_at)} · {a.term_months} mo
                    {a.purpose ? ` · "${a.purpose}"` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    a.status === "approved"
                      ? "bg-primary/15 text-primary"
                      : a.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/30 text-accent-foreground"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {!loans || loans.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {members && members.length === 0
              ? "Add a member first, then you can issue a loan."
              : "No loans yet."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {loans.map((l: any) => {
            const repaid = (l.repayments ?? []).reduce(
              (a: number, r: any) => a + Number(r.amount),
              0,
            );
            const principal = Number(l.principal);
            const interest = principal * (Number(l.interest_rate) / 100);
            const owed = Math.max(0, principal + interest - repaid);
            const fullyPaid = owed === 0;
            return (
              <Card key={l.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{l.members?.name ?? "—"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        fullyPaid
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-accent/30 text-accent-foreground"
                      }`}>
                        {fullyPaid ? "paid" : l.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Issued {fmtDate(l.issued_date)} · {Number(l.interest_rate)}% interest ({money(interest)})
                      {l.due_date ? ` · due ${fmtDate(l.due_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="font-display tabular-nums">{money(l.principal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Outstanding (incl. interest)</p>
                      <p className="font-display tabular-nums text-primary">{money(owed)}</p>
                    </div>
                    {!fullyPaid && <RepayButton loanId={l.id} owed={owed} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RepayButton({ loanId, owed }: { loanId: string; owed: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return toast.error("Enter a valid amount");
    }
    if (amt > owed + 0.005) {
      return toast.error(`Amount exceeds outstanding balance (${money(owed)})`);
    }
    const { error } = await supabase.from("repayments").insert({
      user_id: user.id,
      loan_id: loanId,
      amount: amt,
    });
    if (error) return toast.error(error.message);
    if (amt >= owed - 0.005) {
      await supabase.from("loans").update({ status: "paid" }).eq("id", loanId);
    }
    toast.success("Repayment recorded");
    setAmount("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <ArrowDownToLine className="h-4 w-4" /> Repay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record repayment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ra">Amount (owed: {money(owed)})</Label>
            <Input id="ra" type="number" min="0" max={owed.toFixed(2)} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Maximum: {money(owed)}</p>
          </div>
          <DialogFooter>
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" /> Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
