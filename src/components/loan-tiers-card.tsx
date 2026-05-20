import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, Plus, Layers } from "lucide-react";
import { toast } from "sonner";

type TierRow = {
  id: string;
  min_amount: number;
  max_amount: number | null;
  repayment_months: number;
  interest_rate: number;
  installments: number;
  requires_approval: boolean;
  sort_order: number;
};

const DEFAULT_TIERS: Omit<TierRow, "id">[] = [
  { min_amount: 1, max_amount: 30000, repayment_months: 3, interest_rate: 10, installments: 3, requires_approval: false, sort_order: 0 },
  { min_amount: 31000, max_amount: 50000, repayment_months: 3, interest_rate: 12, installments: 3, requires_approval: false, sort_order: 1 },
  { min_amount: 51000, max_amount: 100000, repayment_months: 4, interest_rate: 15, installments: 4, requires_approval: false, sort_order: 2 },
  { min_amount: 100001, max_amount: null, repayment_months: 6, interest_rate: 20, installments: 6, requires_approval: true, sort_order: 3 },
];

export function LoanTiersCard({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["loan-tiers", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_tiers")
        .select("*")
        .eq("user_id", userId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TierRow[];
    },
  });

  const seedDefaults = async () => {
    if (!userId) return;
    const rows = DEFAULT_TIERS.map((t) => ({ ...t, user_id: userId }));
    const { error } = await supabase.from("loan_tiers").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Default tiers loaded");
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  const addTier = async () => {
    if (!userId) return;
    const nextOrder = tiers?.length ?? 0;
    const { error } = await supabase.from("loan_tiers").insert({
      user_id: userId,
      min_amount: 0,
      max_amount: null,
      repayment_months: 3,
      interest_rate: 10,
      installments: 3,
      requires_approval: false,
      sort_order: nextOrder,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  return (
    <Card className="p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" /> Loan amount tiers
          </h2>
          <p className="text-sm text-muted-foreground">
            Brackets that decide repayment period, interest, and installments based on loan amount.
          </p>
        </div>
        <div className="flex gap-2">
          {(!tiers || tiers.length === 0) && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              Load defaults
            </Button>
          )}
          <Button size="sm" onClick={addTier} className="gap-1">
            <Plus className="h-4 w-4" /> Add tier
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !tiers || tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tiers configured. Click "Load defaults" for the standard ZMW brackets, or "Add tier".
        </p>
      ) : (
        <div className="space-y-3">
          {tiers.map((t) => (
            <TierRowEditor key={t.id} tier={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TierRowEditor({ tier }: { tier: TierRow }) {
  const qc = useQueryClient();
  const [min, setMin] = useState(String(tier.min_amount));
  const [max, setMax] = useState(tier.max_amount == null ? "" : String(tier.max_amount));
  const [months, setMonths] = useState(String(tier.repayment_months));
  const [rate, setRate] = useState(String(tier.interest_rate));
  const [inst, setInst] = useState(String(tier.installments));
  const [approval, setApproval] = useState(tier.requires_approval);

  const save = async () => {
    const payload = {
      min_amount: Math.max(0, Number(min) || 0),
      max_amount: max.trim() === "" ? null : Math.max(0, Number(max) || 0),
      repayment_months: Math.max(1, Number(months) || 1),
      interest_rate: Math.max(0, Number(rate) || 0),
      installments: Math.max(1, Number(inst) || 1),
      requires_approval: approval,
    };
    const { error } = await supabase.from("loan_tiers").update(payload).eq("id", tier.id);
    if (error) return toast.error(error.message);
    toast.success("Tier saved");
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  const remove = async () => {
    const { error } = await supabase.from("loan_tiers").delete().eq("id", tier.id);
    if (error) return toast.error(error.message);
    toast.success("Tier removed");
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <Label className="text-xs">Min amount</Label>
          <Input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max amount (blank = ∞)</Label>
          <Input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} placeholder="∞" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Repayment (months)</Label>
          <Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Interest %</Label>
          <Input type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Installments</Label>
          <Input type="number" min="1" value={inst} onChange={(e) => setInst(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={approval} onCheckedChange={(v) => setApproval(!!v)} />
            Needs approval
          </label>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={remove} className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <Button size="sm" onClick={save} className="gap-1">
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}
