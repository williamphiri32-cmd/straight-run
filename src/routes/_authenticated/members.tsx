import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, UserPlus, Coins } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — Kijiji" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, phone, email, auth_user_id, joined_at, contributions(amount)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [openMember, setOpenMember] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from("members")
      .insert({
        name,
        phone: phone || null,
        email: email.trim() ? email.trim().toLowerCase() : null,
        user_id: user.id,
      });
    if (error) return toast.error(error.message);
    toast.success(
      email
        ? "Member added — they'll be linked when they sign up with that email"
        : "Member added",
    );
    setName("");
    setPhone("");
    setEmail("");
    setOpenMember(false);
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Your group's roster and savings totals.
          </p>
        </div>
        <Dialog open={openMember} onOpenChange={setOpenMember}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Add member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New member</DialogTitle>
            </DialogHeader>
            <form onSubmit={addMember} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="n">Full name</Label>
                <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p">Phone (optional)</Label>
                <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em">Email (to invite to member portal)</Label>
                <Input
                  id="em"
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  They'll be auto-linked when they sign up with this email.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit">Add member</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {!members || members.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No members yet. Add the first one to begin.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {members.map((m: any) => {
            const total = (m.contributions ?? []).reduce(
              (a: number, c: any) => a + Number(c.amount),
              0,
            );
            return (
              <Card key={m.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary font-display font-semibold text-secondary-foreground">
                    {m.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.phone ?? "No phone"} · joined {fmtDate(m.joined_at)}
                    </p>
                    {m.email && (
                      <p className="mt-0.5 text-xs">
                        <span className="text-muted-foreground">{m.email}</span>
                        {m.auth_user_id ? (
                          <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                            linked
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-accent/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                            invited
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saved</p>
                    <p className="font-display tabular-nums">{money(total)}</p>
                  </div>
                  <ContributeButton memberId={m.id} memberName={m.name} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContributeButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("contributions").insert({
      user_id: user.id,
      member_id: memberId,
      amount: Number(amount),
      note: note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Contribution recorded");
    setAmount("");
    setNote("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Coins className="h-4 w-4" /> Contribute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record contribution — {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="a">Amount</Label>
            <Input id="a" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt">Note (optional)</Label>
            <Input id="nt" value={note} onChange={(e) => setNote(e.target.value)} />
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
