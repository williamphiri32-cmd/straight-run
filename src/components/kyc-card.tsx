import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, ShieldQuestionMark as ShieldQuestion, Upload } from "lucide-react";
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

const ID_TYPES = ["NRC"];

export function KycCard({ memberId, groupId }: { memberId: string; groupId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: kyc } = useQuery({
    queryKey: ["member-kyc", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_kyc")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle();
      if (error) throw error;
      return (data as KycRow | null) ?? null;
    },
  });

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(kyc?.full_legal_name ?? "");
    setIdType(kyc?.id_type ?? "");
    setIdNumber(kyc?.id_number ?? "");
    setDob(kyc?.date_of_birth ?? "");
    setAddress(kyc?.address ?? "");
    setIdDoc(null);
    setSelfie(null);
  }, [open, kyc]);

  const upload = async (file: File, label: string) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${groupId}/${memberId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !idType || !idNumber.trim() || !dob) {
      toast.error("Please fill in all required fields");
      return;
    }
    const idRegex = /^\d{6}\/\d{2}\/\d{1}$/;
    if (!idRegex.test(idNumber.trim())) {
      toast.error("ID number must be in format 000000/00/0");
      return;
    }
    setSaving(true);
    try {
      let id_document_path = kyc?.id_document_path ?? null;
      let selfie_path = kyc?.selfie_path ?? null;
      if (idDoc) id_document_path = await upload(idDoc, "id");
      if (selfie) selfie_path = await upload(selfie, "selfie");

      const payload = {
        member_id: memberId,
        user_id: groupId,
        full_legal_name: fullName.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        date_of_birth: dob,
        address: address.trim() || null,
        id_document_path,
        selfie_path,
        status: "pending",
        submitted_at: new Date().toISOString(),
      };

      const { error } = kyc
        ? await supabase.from("member_kyc").update(payload).eq("id", kyc.id)
        : await supabase.from("member_kyc").insert(payload);
      if (error) throw error;

      toast.success("KYC submitted for review");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["member-kyc", memberId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save KYC");
    } finally {
      setSaving(false);
    }
  };

  const status = kyc?.status ?? "not_started";
  const statusMeta: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    not_started: {
      icon: <ShieldQuestion className="h-4 w-4" />,
      label: "Not started",
      cls: "bg-muted text-muted-foreground",
    },
    pending: {
      icon: <ShieldQuestion className="h-4 w-4" />,
      label: "Pending review",
      cls: "bg-accent/30 text-accent-foreground",
    },
    verified: {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Verified",
      cls: "bg-primary/15 text-primary",
    },
    rejected: {
      icon: <ShieldAlert className="h-4 w-4" />,
      label: "Rejected",
      cls: "bg-destructive/10 text-destructive",
    },
  };
  const meta = statusMeta[status] ?? statusMeta.not_started;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">KYC verification</h2>
          <p className="text-sm text-muted-foreground">
            Keep your identity details up to date for loan approvals & share-outs.
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.cls}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          {kyc?.review_note && status === "rejected" && (
            <p className="mt-2 text-xs text-destructive">Note: {kyc.review_note}</p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant={kyc ? "outline" : "default"} className="gap-2">
              <Upload className="h-4 w-4" />
              {kyc ? "Update KYC" : "Start KYC"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{kyc ? "Update KYC" : "Submit KYC"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fn">Full legal name *</Label>
                <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ID type *</Label>
                  <Select value={idType} onValueChange={setIdType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in">ID number *</Label>
                  <Input
                    id="in"
                    value={idNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
                      let formatted = raw;
                      if (raw.length > 6) formatted = raw.slice(0, 6) + "/" + raw.slice(6);
                      if (raw.length > 8) formatted = raw.slice(0, 6) + "/" + raw.slice(6, 8) + "/" + raw.slice(8);
                      setIdNumber(formatted);
                    }}
                    placeholder="000000/00/1"
                    maxLength={11}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth *</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad">Residential address</Label>
                <Textarea id="ad" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} rows={2} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="iddoc">ID document (image/PDF)</Label>
                  <Input id="iddoc" type="file" accept="image/*,application/pdf" onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)} />
                  {kyc?.id_document_path && !idDoc && <p className="text-[11px] text-muted-foreground">Current file on record</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="self">Selfie</Label>
                  <Input id="self" type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
                  {kyc?.selfie_path && !selfie && <p className="text-[11px] text-muted-foreground">Current photo on record</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Submit"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
