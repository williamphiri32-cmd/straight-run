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
import { Plus, Gavel, Save, Trash2, ArrowUp, ArrowDown, MinusCircle } from "lucide-react";
import { toast } from "sonner";

type Offence = {
  id: string;
  offence: string;
  penalty_amount: number;
  penalty_is_percent: boolean;
  penalty_note: string | null;
  sort_order: number;
};

const DEFAULTS: Omit<Offence, "id">[] = [
  { offence: "Late savings deposit", penalty_amount: 20, penalty_is_percent: false, penalty_note: null, sort_order: 0 },
  { offence: "Failure to attend meeting without notice", penalty_amount: 20, penalty_is_percent: false, penalty_note: null, sort_order: 1 },
  { offence: "Failure to respond to voting (72 hours)", penalty_amount: 20, penalty_is_percent: false, penalty_note: null, sort_order: 2 },
  { offence: "Failure to respond to group proposals", penalty_amount: 20, penalty_is_percent: false, penalty_note: null, sort_order: 3 },
  { offence: "Disrespectful conduct", penalty_amount: 10, penalty_is_percent: false, penalty_note: null, sort_order: 4 },
  { offence: "Committee member non-performance", penalty_amount: 20, penalty_is_percent: false, penalty_note: null, sort_order: 5 },
  { offence: "Late loan repayment", penalty_amount: 10, penalty_is_percent: true, penalty_note: "of overdue installment", sort_order: 6 },
];

export function OffencesCard({ userId }: { userId?: string }) {
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

  const { data: rows, isLoading } = useQuery({
    queryKey: ["offence-rules", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offence_rules")
        .select("*")
        .eq("user_id", userId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Offence[];
    },
  });

  const applyPenalty = async (row: Offence) => {
    if (!userId) return;
    if (!memberId) return toast.error("Choose a member first");
    let amount = row.penalty_amount;
    if (row.penalty_is_percent) {
      const baseStr = window.prompt(
        `"${row.offence}" is ${row.penalty_amount}% ${row.penalty_note ?? ""}.\nEnter the base amount (ZMW) to charge against:`,
      );
      const base = Number(baseStr);
      if (!base || base <= 0) return;
      amount = +(base * (row.penalty_amount / 100)).toFixed(2);
    }
    if (!(amount > 0)) return toast.error("Penalty amount must be greater than 0");
    const member = members?.find((m) => m.id === memberId);
    const { error } = await supabase.from("contributions").insert({
      user_id: userId,
      member_id: memberId,
      amount: -Math.abs(amount),
      contribution_date: new Date().toISOString().slice(0, 10),
      note: `Offence penalty: ${row.offence}`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Deducted ZMW ${amount} from ${member?.name ?? "member"}`);
    qc.invalidateQueries({ queryKey: ["contributions"] });
  };

  const seed = async () => {
    if (!userId) return;
    const insertRows = DEFAULTS.map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase.from("offence_rules").insert(insertRows);
    if (error) return toast.error(error.message);
    toast.success("Default offences loaded");
    qc.invalidateQueries({ queryKey: ["offence-rules"] });
  };

  const add = async () => {
    if (!userId) return;
    const next = rows?.length ?? 0;
    const { error } = await supabase.from("offence_rules").insert({
      user_id: userId,
      offence: "New offence",
      penalty_amount: 0,
      penalty_is_percent: false,
      penalty_note: null,
      sort_order: next,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["offence-rules"] });
  };

  const move = async (id: string, dir: "up" | "down") => {
    if (!rows) return;
    const i = rows.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const a = rows[i], b = rows[j];
    await supabase.from("offence_rules").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("offence_rules").update({ sort_order: a.sort_order }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["offence-rules"] });
  };

  return (
    <Card className="p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <Gavel className="h-4 w-4" /> Offences & penalties
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group-wide fines applied to any member who commits an offence.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(!rows || rows.length === 0) && (
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
          Then click <span className="font-medium">Apply</span> on an offence to deduct the fine from their savings.
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No offences configured. Click "Load defaults" for the standard list.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-5 sm:px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-2 whitespace-nowrap">Offence</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Amount</th>
                <th className="pb-2 pr-2 whitespace-nowrap">%</th>
                <th className="pb-2 pr-2 whitespace-nowrap">Note</th>
                <th className="pb-2 whitespace-nowrap w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <Row
                  key={r.id}
                  row={r}
                  canUp={i > 0}
                  canDown={i < rows.length - 1}
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

function Row({
  row, canUp, canDown, onUp, onDown, onApply, canApply,
}: {
  row: Offence;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onApply: () => void;
  canApply: boolean;
}) {
  const qc = useQueryClient();
  const [offence, setOffence] = useState(row.offence);
  const [amount, setAmount] = useState(String(row.penalty_amount));
  const [pct, setPct] = useState(row.penalty_is_percent);
  const [note, setNote] = useState(row.penalty_note ?? "");
  const [editing, setEditing] = useState(false);

  const dirty =
    offence !== row.offence ||
    Number(amount) !== row.penalty_amount ||
    pct !== row.penalty_is_percent ||
    note !== (row.penalty_note ?? "");

  const save = async () => {
    const { error } = await supabase.from("offence_rules").update({
      offence: offence.trim() || "Offence",
      penalty_amount: Math.max(0, Number(amount) || 0),
      penalty_is_percent: pct,
      penalty_note: note.trim() || null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Offence saved");
    qc.invalidateQueries({ queryKey: ["offence-rules"] });
    setEditing(false);
  };

  const remove = async () => {
    const { error } = await supabase.from("offence_rules").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Offence removed");
    qc.invalidateQueries({ queryKey: ["offence-rules"] });
  };

  if (!editing) {
    return (
      <tr className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setEditing(true)}>
        <td className="py-2 pr-2 font-medium">{row.offence}</td>
        <td className="py-2 pr-2 whitespace-nowrap">
          {row.penalty_is_percent ? `${row.penalty_amount}%` : `ZMW ${row.penalty_amount.toLocaleString()}`}
        </td>
        <td className="py-2 pr-2 whitespace-nowrap">{row.penalty_is_percent ? "Yes" : "—"}</td>
        <td className="py-2 pr-2 text-muted-foreground">{row.penalty_note || "—"}</td>
        <td className="py-2 whitespace-nowrap">
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
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-muted/30">
      <td className="py-2 pr-2">
        <Input value={offence} onChange={(e) => setOffence(e.target.value)} className="h-7 text-sm px-2" />
      </td>
      <td className="py-2 pr-2">
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-sm px-2 w-20" />
      </td>
      <td className="py-2 pr-2">
        <Checkbox checked={pct} onCheckedChange={(v) => setPct(!!v)} />
      </td>
      <td className="py-2 pr-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" className="h-7 text-sm px-2" />
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
