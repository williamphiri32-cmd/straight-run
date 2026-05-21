import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Scope = "all" | string; // "all" or member id

const AMOUNT_TABLES = [
  "repayments",
  "loans",
  "loan_applications",
  "contributions",
  "share_out_allocations",
  "share_outs",
] as const;

export function ClearDataCard({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("all");
  const [busy, setBusy] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name")
        .eq("user_id", userId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const clearAll = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      // Delete loans-derived first: repayments depend on loans
      const { error: repErr } = await supabase
        .from("repayments")
        .delete()
        .eq("user_id", userId);
      if (repErr) throw repErr;

      for (const t of ["loans", "loan_applications", "contributions", "share_out_allocations", "share_outs"] as const) {
        const { error } = await supabase.from(t).delete().eq("user_id", userId);
        if (error) throw error;
      }
      toast.success("All amounts cleared for the group");
      AMOUNT_TABLES.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to clear data");
    } finally {
      setBusy(false);
    }
  };

  const clearMember = async (memberId: string) => {
    if (!userId) return;
    setBusy(true);
    try {
      // Find loans for this member to delete their repayments first
      const { data: memberLoans, error: loansErr } = await supabase
        .from("loans")
        .select("id")
        .eq("user_id", userId)
        .eq("member_id", memberId);
      if (loansErr) throw loansErr;
      const loanIds = (memberLoans ?? []).map((l) => l.id);

      if (loanIds.length) {
        const { error: repErr } = await supabase
          .from("repayments")
          .delete()
          .eq("user_id", userId)
          .in("loan_id", loanIds);
        if (repErr) throw repErr;
      }

      for (const t of ["loans", "loan_applications", "contributions", "share_out_allocations"] as const) {
        const { error } = await supabase
          .from(t)
          .delete()
          .eq("user_id", userId)
          .eq("member_id", memberId);
        if (error) throw error;
      }
      toast.success("Member's amounts cleared");
      AMOUNT_TABLES.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to clear member data");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = () => {
    if (scope === "all") clearAll();
    else clearMember(scope);
  };

  const selectedMember = members?.find((m) => m.id === scope);
  const label =
    scope === "all"
      ? "the entire group"
      : selectedMember
      ? selectedMember.name
      : "this member";

  return (
    <Card className="p-6 border-destructive/40">
      <header className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-destructive/10 p-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Clear amounts data</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete contributions, loans, repayments, applications, and
            share-out records — for the whole group or a single member. Settings,
            members, and rules are kept.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose scope…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Entire group (all members)</SelectItem>
            {(members ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={busy} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {busy ? "Clearing…" : "Clear data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear amounts for {label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes contributions, loans, repayments, loan
                applications, and share-out records for {label}. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>
                Yes, clear it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
