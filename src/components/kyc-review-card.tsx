import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, ShieldQuestionMark as ShieldQuestion, Eye } from "lucide-react";
import { toast } from "sonner";

type KycRow = {
  id: string;
  member_id: string;
  user_id: string;
  full_legal_name: string | null;
  id_type: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  id_document_path: string | null;
  selfie_path: string | null;
  status: string;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-accent/30 text-accent-foreground" },
  verified: { label: "Verified", cls: "bg-primary/15 text-primary" },
  rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive" },
};

export function KycReviewCard({ userId }: { userId?: string }) {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["kyc-review", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [kycRes, memRes] = await Promise.all([
        supabase
          .from("member_kyc")
          .select("*")
          .eq("user_id", userId!)
          .order("submitted_at", { ascending: false, nullsFirst: false }),
        supabase.from("members").select("id, name").eq("user_id", userId!),
      ]);
      if (kycRes.error) throw kycRes.error;
      if (memRes.error) throw memRes.error;
      const nameMap = new Map((memRes.data ?? []).map((m: any) => [m.id, m.name]));
      return (kycRes.data as KycRow[]).map((r) => ({
        ...r,
        memberName: nameMap.get(r.member_id) ?? "Unknown",
      }));
    },
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const active = rows.find((r) => r.id === openId) ?? null;

  const setStatus = async (row: KycRow, status: "verified" | "rejected", note: string) => {
    const { error } = await supabase
      .from("member_kyc")
      .update({
        status,
        review_note: note.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "verified" ? "Member verified" : "Member rejected");
    setOpenId(null);
    qc.invalidateQueries({ queryKey: ["kyc-review", userId] });
    qc.invalidateQueries({ queryKey: ["member-kyc", row.member_id] });
  };


  return (
    <Card className="p-6">
      <header className="mb-4">
        <h2 className="font-display text-lg font-semibold">KYC verification</h2>
        <p className="text-sm text-muted-foreground">
          Review members' identity submissions and approve or reject them.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No KYC submissions yet.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            const Icon =
              r.status === "verified"
                ? ShieldCheck
                : r.status === "rejected"
                  ? ShieldAlert
                  : ShieldQuestion;
            if (r.status === "verified") {
              return (
                <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="font-medium truncate">{(r as any).memberName}</span>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    · {r.id_type ?? "—"} · {r.id_number ?? "—"}
                  </span>
                  <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)} className="h-7 w-7 p-0">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            }
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{(r as any).memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.id_type ?? "—"} · {r.id_number ?? "—"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.cls}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)} className="gap-1">
                  <Eye className="h-3.5 w-3.5" /> Review
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review KYC{active ? ` — ${(active as any).memberName}` : ""}</DialogTitle>
          </DialogHeader>
          {active && <ReviewBody row={active} onDecide={setStatus} onCancel={() => setOpenId(null)} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReviewBody({
  row,
  onDecide,
  onCancel,
}: {
  row: KycRow;
  onDecide: (row: KycRow, status: "verified" | "rejected", note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(row.review_note ?? "");
  const [busy, setBusy] = useState(false);

  const docs = (() => {
    if (!row.id_document_path) return {} as { front?: string; back?: string };
    try {
      const p = JSON.parse(row.id_document_path);
      return typeof p === "object" && p ? p : { front: row.id_document_path };
    } catch {
      return { front: row.id_document_path };
    }
  })();

  const paths = [docs.front, docs.back, row.selfie_path].filter(Boolean) as string[];

  const { data: urls = {} } = useQuery({
    queryKey: ["kyc-signed-urls", row.id, paths.join("|")],
    enabled: paths.length > 0,
    queryFn: async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        paths.map(async (p) => {
          const { data } = await supabase.storage.from("kyc").createSignedUrl(p, 60 * 10);
          if (data?.signedUrl) out[p] = data.signedUrl;
        }),
      );
      return out;
    },
  });

  const decide = async (status: "verified" | "rejected") => {
    setBusy(true);
    await onDecide(row, status, note);
    setBusy(false);
  };

  const Field = ({ label, value }: { label: string; value: string | null }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );

  const Img = ({ label, path }: { label: string; path?: string }) =>
    path && urls[path] ? (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <a href={urls[path]} target="_blank" rel="noreferrer" className="block">
          <img
            src={urls[path]}
            alt={label}
            className="w-full rounded-md border object-cover"
            style={{ maxHeight: 220 }}
          />
        </a>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full legal name" value={row.full_legal_name} />
        <Field label="Status" value={row.status} />
        <Field label="ID type" value={row.id_type} />
        <Field label="ID number" value={row.id_number} />
        <Field label="Date of birth" value={row.date_of_birth} />
        <Field
          label="Submitted"
          value={row.submitted_at ? new Date(row.submitted_at).toLocaleString() : null}
        />
      </div>
      <Field label="Address" value={row.address} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Img label="ID front" path={docs.front} />
        <Img label="ID back" path={docs.back} />
        <Img label="Selfie" path={row.selfie_path ?? undefined} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Review note (optional)</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Reason if rejecting…"
        />
      </div>

      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => decide("rejected")} disabled={busy}>
          Reject
        </Button>
        <Button onClick={() => decide("verified")} disabled={busy}>
          Verify
        </Button>
      </DialogFooter>
    </div>
  );
}
