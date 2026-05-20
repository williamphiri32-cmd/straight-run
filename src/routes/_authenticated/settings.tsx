import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Trash2, Plus, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Kijiji" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["group-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: overrides } = useQuery({
    queryKey: ["member-loan-limits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_loan_limits")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [duration, setDuration] = useState("12");
  const [interest, setInterest] = useState("0");
  const [penalty, setPenalty] = useState("5");
  const [maxTenure, setMaxTenure] = useState("12");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDuration(String(settings.saving_duration_months));
      setInterest(String(settings.default_interest_rate));
      setPenalty(String(settings.default_penalty_rate));
      setMaxTenure(String(settings.default_max_tenure_months ?? 12));
    }
  }, [settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      saving_duration_months: Math.max(1, Number(duration) || 1),
      default_interest_rate: Math.max(0, Number(interest) || 0),
      default_penalty_rate: Math.max(0, Number(penalty) || 0),
      default_max_tenure_months: Math.max(1, Number(maxTenure) || 1),
    };
    const { error } = await supabase
      .from("group_settings")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["group-settings"] });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your group's saving cycle, default rates, and loan tenure limits.
        </p>
      </header>

      <Card className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="dur">Saving duration (months)</Label>
              <Input
                id="dur"
                type="number"
                min="1"
                step="1"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Length of one saving cycle before share-out.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="int">Default interest %</Label>
                <Input
                  id="int"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pen">Default penalty %</Label>
                <Input
                  id="pen"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ten">Max loan tenure (months)</Label>
                <Input
                  id="ten"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={maxTenure}
                  onChange={(e) => setMaxTenure(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Applies to all members unless overridden below.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={saving} className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <LoanTiersCard userId={user?.id} />

      <MemberTenureOverrides
        userId={user?.id}
        members={members ?? []}
        overrides={overrides ?? []}
        defaultTenure={Number(maxTenure) || 12}
      />
    </div>
  );
}

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

function LoanTiersCard({ userId }: { userId?: string }) {
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
    const nextOrder = (tiers?.length ?? 0);
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



function MemberTenureOverrides({
  userId,
  members,
  overrides,
  defaultTenure,
}: {
  userId?: string;
  members: Array<{ id: string; name: string }>;
  overrides: Array<{ id: string; member_id: string; max_tenure_months: number }>;
  defaultTenure: number;
}) {
  const qc = useQueryClient();
  const overrideMap = new Map(overrides.map((o) => [o.member_id, o]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const valueFor = (memberId: string) =>
    drafts[memberId] ?? String(overrideMap.get(memberId)?.max_tenure_months ?? "");

  const save = async (memberId: string) => {
    if (!userId) return;
    const raw = valueFor(memberId).trim();
    if (!raw) return toast.error("Enter a tenure or click Reset");
    const val = Math.max(1, Number(raw) || 0);
    const { error } = await supabase
      .from("member_loan_limits")
      .upsert(
        { user_id: userId, member_id: memberId, max_tenure_months: val },
        { onConflict: "member_id" },
      );
    if (error) return toast.error(error.message);
    toast.success("Override saved");
    setDrafts((d) => {
      const { [memberId]: _, ...rest } = d;
      return rest;
    });
    qc.invalidateQueries({ queryKey: ["member-loan-limits"] });
  };

  const reset = async (memberId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("member_loan_limits")
      .delete()
      .eq("user_id", userId)
      .eq("member_id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Override removed");
    setDrafts((d) => {
      const { [memberId]: _, ...rest } = d;
      return rest;
    });
    qc.invalidateQueries({ queryKey: ["member-loan-limits"] });
  };

  return (
    <Card className="p-6">
      <header className="mb-4">
        <h2 className="font-display text-lg font-semibold">Per-member tenure overrides</h2>
        <p className="text-sm text-muted-foreground">
          Customise the max loan tenure for specific members. Leave blank to use the
          group default ({defaultTenure} months).
        </p>
      </header>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <ul className="divide-y">
          {members.map((m) => {
            const existing = overrideMap.get(m.id);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {existing
                      ? `Custom: ${existing.max_tenure_months} months`
                      : `Using group default (${defaultTenure} months)`}
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={`${defaultTenure}`}
                  className="w-24"
                  value={valueFor(m.id)}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [m.id]: e.target.value }))
                  }
                />
                <Button size="sm" onClick={() => save(m.id)} className="gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                {existing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reset(m.id)}
                    className="gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
