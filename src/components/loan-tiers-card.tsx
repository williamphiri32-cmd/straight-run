import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Layers, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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

function fmtMoney(n: number | null) {
  if (n == null) return "∞";
  return n.toLocaleString();
}

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

  const move = async (id: string, direction: "up" | "down") => {
    if (!tiers) return;
    const idx = tiers.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tiers.length) return;
    const a = tiers[idx];
    const b = tiers[swapIdx];
    await supabase.from("loan_tiers").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("loan_tiers").update({ sort_order: a.sort_order }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  return (
    <Card className="p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" /> Loan amount tiers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Brackets that decide repayment period, interest, and installments based on loan amount.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(!tiers || tiers.length === 0) && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              Load defaults
            </Button>
          )}
          <Button size="sm" onClick={addTier} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !tiers || tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tiers configured. Click "Load defaults" for the standard ZMW brackets, or "Add".
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-5 sm:px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-2 whitespace-nowrap">Min (ZMW)</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Max (ZMW)</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Months</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Interest %</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Inst.</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Approval</th>
                <th className="pb-2 whitespace-nowrap w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tiers.map((t, i) => (
                <TierTableRow
                  key={t.id}
                  tier={t}
                  canMoveUp={i > 0}
                  canMoveDown={i < tiers.length - 1}
                  onMoveUp={() => move(t.id, "up")}
                  onMoveDown={() => move(t.id, "down")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TierTableRow({
  tier,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  tier: TierRow;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const qc = useQueryClient();
  const [min, setMin] = useState(String(tier.min_amount));
  const [max, setMax] = useState(tier.max_amount == null ? "" : String(tier.max_amount));
  const [months, setMonths] = useState(String(tier.repayment_months));
  const [rate, setRate] = useState(String(tier.interest_rate));
  const [inst, setInst] = useState(String(tier.installments));
  const [approval, setApproval] = useState(tier.requires_approval);
  const [isEditing, setIsEditing] = useState(false);

  const hasChanges =
    Number(min) !== tier.min_amount ||
    (max.trim() === "" ? null : Number(max)) !== tier.max_amount ||
    Number(months) !== tier.repayment_months ||
    Number(rate) !== tier.interest_rate ||
    Number(inst) !== tier.installments ||
    approval !== tier.requires_approval;

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
    setIsEditing(false);
  };

  const remove = async () => {
    const { error } = await supabase.from("loan_tiers").delete().eq("id", tier.id);
    if (error) return toast.error(error.message);
    toast.success("Tier removed");
    qc.invalidateQueries({ queryKey: ["loan-tiers"] });
  };

  if (!isEditing) {
    return (
      <tr
        className="group cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <td className="py-2 pr-2 whitespace-nowrap">{fmtMoney(tier.min_amount)}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{fmtMoney(tier.max_amount)}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{tier.repayment_months}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{tier.interest_rate}%</td>
        <td className="py-2 pr-2 whitespace-nowrap">{tier.installments}</td>
        <td className="py-2 pr-2 whitespace-nowrap">
          {tier.requires_approval ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Yes
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              No
            </span>
          )}
        </td>
        <td className="py-2 whitespace-nowrap">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveUp} onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveDown} onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); remove(); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-muted/30">
      <td className="py-2 pr-2">
        <Input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} placeholder="∞" className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="1" value={inst} onChange={(e) => setInst(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Checkbox checked={approval} onCheckedChange={(v) => setApproval(!!v)} />
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          {hasChanges && (
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={save}>
              <Save className="h-3 w-3" /> Save
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
