import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Trash2 } from "lucide-react";
import { LoanTiersCard } from "@/components/loan-tiers-card";
import { SavingsInactivityCard } from "@/components/savings-inactivity-card";
import { OffencesCard } from "@/components/offences-card";
import { PayoutRulesCard } from "@/components/payout-rules-card";
import { ClearDataCard } from "@/components/clear-data-card";
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
  const [loanLimitMult, setLoanLimitMult] = useState("3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDuration(String(settings.saving_duration_months));
      setInterest(String(settings.default_interest_rate));
      setPenalty(String(settings.default_penalty_rate));
      setMaxTenure(String(settings.default_max_tenure_months ?? 12));
      setLoanLimitMult(String((settings as any).loan_limit_multiplier ?? 3));
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
      loan_limit_multiplier: Math.max(0, Number(loanLimitMult) || 0),
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

      <PayoutRulesCard />

      <LoanTiersCard userId={user?.id} />

      <SavingsInactivityCard userId={user?.id} />

      <OffencesCard userId={user?.id} />

      <MemberTenureOverrides
        userId={user?.id}
        members={members ?? []}
        overrides={overrides ?? []}
        defaultTenure={Number(maxTenure) || 12}
      />

      <ClearDataCard userId={user?.id} />
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
