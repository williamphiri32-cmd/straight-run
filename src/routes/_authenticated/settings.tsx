import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon } from "lucide-react";
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

  const [duration, setDuration] = useState("12");
  const [interest, setInterest] = useState("0");
  const [penalty, setPenalty] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDuration(String(settings.saving_duration_months));
      setInterest(String(settings.default_interest_rate));
      setPenalty(String(settings.default_penalty_rate));
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
          Configure your group's saving cycle and default rates.
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                <p className="text-xs text-muted-foreground">
                  Applied to the loan principal.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Charged per overdue period on outstanding loans.
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
    </div>
  );
}