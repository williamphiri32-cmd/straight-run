import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Loan applications — Kijiji" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: apps } = useQuery({
    queryKey: ["applications", user?.id],
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

  const decide = async (
    app: any,
    status: "approved" | "rejected",
  ) => {
    if (!user) return;
    const { error } = await supabase
      .from("loan_applications")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) return toast.error(error.message);

    if (status === "approved") {
      // Issue the actual loan
      const due = new Date();
      due.setMonth(due.getMonth() + (app.term_months ?? 3));
      const { error: loanErr } = await supabase.from("loans").insert({
        user_id: user.id,
        member_id: app.member_id,
        principal: app.amount,
        interest_rate: 0,
        due_date: due.toISOString().slice(0, 10),
        application_id: app.id,
        note: app.purpose,
      });
      if (loanErr) return toast.error(loanErr.message);
    }
    toast.success(`Application ${status}`);
    qc.invalidateQueries({ queryKey: ["applications"] });
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["portal"] });
  };

  const pending = (apps ?? []).filter((a) => a.status === "pending");
  const decided = (apps ?? []).filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Loan applications</h1>
        <p className="text-sm text-muted-foreground">
          Review and decide on pending member requests.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Pending · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No pending applications.
          </Card>
        ) : (
          pending.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{a.member_name}</p>
                <p className="font-display text-xl tabular-nums">
                  {money(a.amount)} · {a.term_months} mo
                </p>
                {a.purpose && (
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    "{a.purpose}"
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {fmtDate(a.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => decide(a, "rejected")}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => decide(a, "approved")}
                >
                  <Check className="h-4 w-4" /> Approve & issue
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          <Card className="divide-y">
            {decided.map((a) => (
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
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    a.status === "approved"
                      ? "bg-primary/15 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
