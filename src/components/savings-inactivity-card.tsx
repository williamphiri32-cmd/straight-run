import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle, Save, Trash2, ArrowUp, ArrowDown, MinusCircle } from "lucide-react";
import { toast } from "sonner";

type Rule = {
  id: string;
  months_without_saving: number;
  action: string;
  outcome: string | null;
  penalty_amount: number;
  suspends_borrowing: boolean;
  expels_member: boolean;
  sort_order: number;
};

const DEFAULTS: Omit<Rule, "id">[] = [
  { months_without_saving: 1, action: "Reminder", outcome: "No penalty", penalty_amount: 0, suspends_borrowing: false, expels_member: false, sort_order: 0 },
  { months_without_saving: 2, action: "Written warning", outcome: "Monitoring", penalty_amount: 0, suspends_borrowing: false, expels_member: false, sort_order: 1 },
  { months_without_saving: 3, action: "Penalty", outcome: "ZMW 100 fine", penalty_amount: 100, suspends_borrowing: false, expels_member: false, sort_order: 2 },
  { months_without_saving: 4, action: "Suspension", outcome: "No borrowing", penalty_amount: 0, suspends_borrowing: true, expels_member: false, sort_order: 3 },
  { months_without_saving: 6, action: "Expulsion", outcome: "Loss of profits", penalty_amount: 0, suspends_borrowing: true, expels_member: true, sort_order: 4 },
];

export function SavingsInactivityCard({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [memberId, setMemberId] = useState<string>("");

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

  const { data: rules, isLoading } = useQuery({
    queryKey: ["savings-inactivity", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_inactivity_rules")
        .select("*")
        .eq("user_id", userId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const applyPenalty = async (rule: Rule) => {
    if (!userId) return;
    if (!memberId) return toast.error("Choose a member first");
    if (!(rule.penalty_amount > 0)) return toast.error("This rule has no penalty amount");
    const member = members?.find((m) => m.id === memberId);
    const { error } = await supabase.from("contributions").insert({
      user_id: userId,
      member_id: memberId,
      amount: -Math.abs(rule.penalty_amount),
      contribution_date: new Date().toISOString().slice(0, 10),
      note: `Inactivity penalty: ${rule.action} (${rule.months_without_saving}m)`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Deducted ZMW ${rule.penalty_amount} from ${member?.name ?? "member"}`);
    qc.invalidateQueries({ queryKey: ["contributions"] });
  };
  const seed = async () => {
    if (!userId) return;
    const rows = DEFAULTS.map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase.from("savings_inactivity_rules").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Default rules loaded");
    qc.invalidateQueries({ queryKey: ["savings-inactivity"] });
  };

  const add = async () => {
    if (!userId) return;
    const next = rules?.length ?? 0;
    const { error } = await supabase.from("savings_inactivity_rules").insert({
      user_id: userId,
      months_without_saving: 1,
      action: "Reminder",
      outcome: "",
      penalty_amount: 0,
      suspends_borrowing: false,
      expels_member: false,
      sort_order: next,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["savings-inactivity"] });
  };

  const move = async (id: string, dir: "up" | "down") => {
    if (!rules) return;
    const i = rules.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rules.length) return;
    const a = rules[i], b = rules[j];
    await supabase.from("savings_inactivity_rules").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("savings_inactivity_rules").update({ sort_order: a.sort_order }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["savings-inactivity"] });
  };

  return (
    <Card className="p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Savings inactivity policy
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Escalation steps applied to any member who skips contributions for consecutive months.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(!rules || rules.length === 0) && (
            <Button variant="outline" size="sm" onClick={seed}>Load defaults</Button>
          )}
          <Button size="sm" onClick={add} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2.5">
        <span className="text-xs font-medium text-muted-foreground">Apply to member:</span>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="h-8 w-56 text-sm">
            <SelectValue placeholder="Choose member…" />
          </SelectTrigger>
          <SelectContent>
            {(members ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Then click <span className="font-medium">Apply</span> on a rule to deduct it from their savings.
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !rules || rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rules configured. Click "Load defaults" for the standard escalation policy.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-5 sm:px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-2 whitespace-nowrap">Months</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Action</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Outcome</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Penalty (ZMW)</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Suspend</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Expel</th>
                <th className="pb-2 whitespace-nowrap w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((r, i) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  canUp={i > 0}
                  canDown={i < rules.length - 1}
                  onUp={() => move(r.id, "up")}
                  onDown={() => move(r.id, "down")}
                  onApply={() => applyPenalty(r)}
                  canApply={!!memberId && r.penalty_amount > 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RuleRow({
  rule, canUp, canDown, onUp, onDown, onApply, canApply,
}: {
  rule: Rule;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onApply: () => void;
  canApply: boolean;
}) {
  const qc = useQueryClient();
  const [months, setMonths] = useState(String(rule.months_without_saving));
  const [action, setAction] = useState(rule.action);
  const [outcome, setOutcome] = useState(rule.outcome ?? "");
  const [penalty, setPenalty] = useState(String(rule.penalty_amount));
  const [suspend, setSuspend] = useState(rule.suspends_borrowing);
  const [expel, setExpel] = useState(rule.expels_member);
  const [editing, setEditing] = useState(false);

  const dirty =
    Number(months) !== rule.months_without_saving ||
    action !== rule.action ||
    outcome !== (rule.outcome ?? "") ||
    Number(penalty) !== rule.penalty_amount ||
    suspend !== rule.suspends_borrowing ||
    expel !== rule.expels_member;

  const save = async () => {
    const { error } = await supabase.from("savings_inactivity_rules").update({
      months_without_saving: Math.max(1, Number(months) || 1),
      action: action.trim() || "Reminder",
      outcome: outcome.trim() || null,
      penalty_amount: Math.max(0, Number(penalty) || 0),
      suspends_borrowing: suspend,
      expels_member: expel,
    }).eq("id", rule.id);
    if (error) return toast.error(error.message);
    toast.success("Rule saved");
    qc.invalidateQueries({ queryKey: ["savings-inactivity"] });
    setEditing(false);
  };

  const remove = async () => {
    const { error } = await supabase.from("savings_inactivity_rules").delete().eq("id", rule.id);
    if (error) return toast.error(error.message);
    toast.success("Rule removed");
    qc.invalidateQueries({ queryKey: ["savings-inactivity"] });
  };

  if (!editing) {
    return (
      <tr className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setEditing(true)}>
        <td className="py-2 pr-2 whitespace-nowrap font-medium">{rule.months_without_saving}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{rule.action}</td>
        <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">{rule.outcome || "—"}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{rule.penalty_amount > 0 ? rule.penalty_amount.toLocaleString() : "—"}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{rule.suspends_borrowing ? "Yes" : "—"}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{rule.expels_member ? "Yes" : "—"}</td>
        <td className="py-2 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={!canApply}
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              title={canApply ? "Deduct penalty from selected member" : "Pick a member and set a penalty > 0"}
            >
              <MinusCircle className="h-3 w-3" /> Apply
            </Button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canUp} onClick={(e) => { e.stopPropagation(); onUp(); }}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canDown} onClick={(e) => { e.stopPropagation(); onDown(); }}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); remove(); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-muted/30">
      <td className="py-2 pr-2">
        <Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} className="h-7 text-sm px-2 w-16" />
      </td>
      <td className="py-2 pr-2">
        <Input value={action} onChange={(e) => setAction(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="0" value={penalty} onChange={(e) => setPenalty(e.target.value)} className="h-7 text-sm px-2 w-20" />
      </td>
      <td className="py-2 pr-2">
        <Checkbox checked={suspend} onCheckedChange={(v) => setSuspend(!!v)} />
      </td>
      <td className="py-2 pr-2">
        <Checkbox checked={expel} onCheckedChange={(v) => setExpel(!!v)} />
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          {dirty && (
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={save}>
              <Save className="h-3 w-3" /> Save
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
