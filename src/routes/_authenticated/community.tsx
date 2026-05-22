import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  BookOpen,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Send,
  Trash2,
  Plus,
  Heart,
  Paperclip,
  X,
  FileIcon,
  Play,
  Vote,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Community — Kijiji" }] }),
  component: CommunityPage,
});

type Category = "idea" | "journal" | "question" | "announcement" | "poll";

const CATEGORIES: { value: Category; label: string; icon: typeof Lightbulb; tone: string }[] = [
  { value: "idea", label: "Business Idea", icon: Lightbulb, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "journal", label: "Journal", icon: BookOpen, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "question", label: "Question", icon: HelpCircle, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  { value: "announcement", label: "Announcement", icon: Megaphone, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400" },
  { value: "poll", label: "Poll", icon: Vote, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
];

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 4;

function catMeta(c: string) {
  return CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[0];
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function kindOf(mime: string): "image" | "video" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function publicUrl(path: string) {
  return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
}

function CommunityPage() {
  const { user } = useAuth();
  const { isMember, isTreasurer, linkedMembers, loading } = useRole();
  const me = linkedMembers[0];
  const groupId = me?.user_id;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | Category>("all");

  const { data } = useQuery({
    queryKey: ["community", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const [postsRes, commentsRes, membersRes, likesRes, attRes, pollOptRes, pollVoteRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", groupId!).order("created_at", { ascending: false }),
        supabase.from("post_comments").select("*").eq("user_id", groupId!).order("created_at", { ascending: true }),
        supabase.from("members").select("id, name").eq("user_id", groupId!),
        supabase.from("post_likes" as any).select("*").eq("user_id", groupId!),
        supabase.from("post_attachments" as any).select("*").eq("user_id", groupId!).order("created_at", { ascending: true }),
        supabase.from("post_poll_options" as any).select("*").eq("user_id", groupId!).order("sort_order", { ascending: true }),
        supabase.from("post_poll_votes" as any).select("*").eq("user_id", groupId!),
      ]);
      return {
        posts: postsRes.data ?? [],
        comments: commentsRes.data ?? [],
        members: membersRes.data ?? [],
        likes: (likesRes.data as any[]) ?? [],
        attachments: (attRes.data as any[]) ?? [],
        pollOptions: (pollOptRes.data as any[]) ?? [],
        pollVotes: (pollVoteRes.data as any[]) ?? [],
      };
    },
  });

  useEffect(() => {
    if (!groupId) return;
    const ch = supabase
      .channel(`community-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_attachments", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_poll_options", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_poll_votes", filter: `user_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["community", groupId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, qc]);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.members ?? []).forEach((m: any) => map.set(m.id, m.name));
    return (id: string) => map.get(id) ?? "Member";
  }, [data?.members]);

  const filteredPosts = useMemo(() => {
    const posts = data?.posts ?? [];
    return filter === "all" ? posts : posts.filter((p: any) => p.category === filter);
  }, [data?.posts, filter]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!isMember || !me) {
    return (
      <Card className="p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Community is for group members</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account ({user?.email}) isn't linked to a member record yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> Community
          </h1>
          <p className="text-sm text-muted-foreground">
            Share business ideas, journal your journey, and ask the group.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </FilterChip>
          ))}
        </div>
      </header>

      <NewPostCard memberId={me.id} groupId={me.user_id} userId={user!.id} />

      {filteredPosts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No posts yet. Be the first to share.
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((p: any) => (
            <PostCard
              key={p.id}
              post={p}
              comments={(data?.comments ?? []).filter((c: any) => c.post_id === p.id)}
              likes={(data?.likes ?? []).filter((l: any) => l.post_id === p.id)}
              attachments={(data?.attachments ?? []).filter((a: any) => a.post_id === p.id)}
              memberName={memberName}
              currentMemberId={me.id}
              groupId={me.user_id}
              canModerate={isTreasurer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}

function AttachmentPreview({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => {
        const k = kindOf(f.type);
        const url = URL.createObjectURL(f);
        return (
          <div key={i} className="relative group rounded-md border bg-muted/30 overflow-hidden">
            {k === "image" ? (
              <img src={url} alt={f.name} className="h-20 w-20 object-cover" />
            ) : k === "video" ? (
              <video src={url} className="h-20 w-20 object-cover" />
            ) : (
              <div className="h-20 w-32 flex items-center gap-2 px-3 text-xs">
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{f.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 shadow opacity-0 group-hover:opacity-100 transition"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NewPostCard({ memberId, groupId, userId }: { memberId: string; groupId: string; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const next: File[] = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) { toast.error(`Up to ${MAX_FILES} files`); break; }
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} is over 25 MB`); continue; }
      next.push(f);
    }
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = content.trim();
    if (!c && files.length === 0) return toast.error("Write something or add a file");
    if (c.length > 5000) return toast.error("Keep it under 5000 characters");
    setSubmitting(true);

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: groupId,
        member_id: memberId,
        category,
        title: title.trim() ? title.trim().slice(0, 200) : null,
        content: c || "",
      })
      .select()
      .single();

    if (error || !post) { setSubmitting(false); return toast.error(error?.message ?? "Failed"); }

    if (files.length > 0) {
      const uploads = await Promise.all(files.map(async (f) => {
        const ext = f.name.split(".").pop() ?? "bin";
        const path = `${userId}/${post.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("community").upload(path, f, {
          contentType: f.type || "application/octet-stream",
          cacheControl: "3600",
        });
        if (up.error) return { error: up.error.message };
        return {
          post_id: post.id,
          user_id: groupId,
          member_id: memberId,
          storage_path: path,
          mime_type: f.type || "application/octet-stream",
          file_name: f.name,
          size_bytes: f.size,
          kind: kindOf(f.type),
        };
      }));
      const rows = uploads.filter((u: any) => !u.error);
      const failed = uploads.length - rows.length;
      if (rows.length > 0) {
        const { error: attErr } = await supabase.from("post_attachments" as any).insert(rows as any);
        if (attErr) toast.error(`Attachments: ${attErr.message}`);
      }
      if (failed > 0) toast.error(`${failed} file(s) failed to upload`);
    }

    setSubmitting(false);
    toast.success("Posted");
    setTitle(""); setContent(""); setCategory("idea"); setFiles([]); setOpen(false);
    qc.invalidateQueries({ queryKey: ["community", groupId] });
  };

  if (!open) {
    return (
      <Card className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-md border border-dashed px-4 py-3 text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Share an idea, journal entry, or question…
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="inline-flex items-center gap-2">
                      <c.icon className="h-4 w-4" /> {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t">Title (optional)</Label>
            <Input id="t" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short headline" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c">Your message</Label>
          <Textarea
            id="c"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Share an idea, your weekly journal, or a question for the group…"
          />
          <p className="text-[11px] text-muted-foreground">{content.length}/5000</p>
        </div>

        <AttachmentPreview files={files} onRemove={(i) => setFiles(files.filter((_, idx) => idx !== i))} />

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
        />

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
            <Paperclip className="h-4 w-4" /> Attach
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" /> {submitting ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function AttachmentGrid({ attachments }: { attachments: any[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3">
      {attachments.map((a) => {
        const url = publicUrl(a.storage_path);
        if (a.kind === "image") {
          return (
            <a key={a.id} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border bg-muted">
              <img src={url} alt={a.file_name} loading="lazy" className="h-40 w-full object-cover hover:opacity-90 transition" />
            </a>
          );
        }
        if (a.kind === "video") {
          return (
            <div key={a.id} className="relative overflow-hidden rounded-md border bg-black">
              <video src={url} controls preload="metadata" className="h-40 w-full object-cover" />
              <Play className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-white/70" />
            </div>
          );
        }
        return (
          <a
            key={a.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-muted transition"
          >
            <FileIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{a.file_name}</span>
          </a>
        );
      })}
    </div>
  );
}

function PostCard({
  post, comments, likes, attachments, memberName, currentMemberId, groupId, canModerate,
}: {
  post: any;
  comments: any[];
  likes: any[];
  attachments: any[];
  memberName: (id: string) => string;
  currentMemberId: string;
  groupId: string;
  canModerate: boolean;
}) {
  const meta = catMeta(post.category);
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const isAuthor = post.member_id === currentMemberId;
  const initials = memberName(post.member_id).slice(0, 1).toUpperCase();
  const myLike = likes.find((l) => l.member_id === currentMemberId);
  const [liking, setLiking] = useState(false);

  const topLevel = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    if (myLike) {
      const { error } = await supabase.from("post_likes" as any).delete().eq("id", myLike.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("post_likes" as any).insert({
        post_id: post.id, user_id: groupId, member_id: currentMemberId,
      } as any);
      if (error) toast.error(error.message);
    }
    setLiking(false);
    qc.invalidateQueries({ queryKey: ["community", groupId] });
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = reply.trim();
    if (!c) return;
    if (c.length > 2000) return toast.error("Keep replies under 2000 characters");
    const { error } = await supabase.from("post_comments").insert({
      post_id: post.id,
      user_id: groupId,
      member_id: currentMemberId,
      content: c,
      parent_id: replyTo?.id ?? null,
    } as any);
    if (error) return toast.error(error.message);
    setReply("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["community", groupId] });
  };

  const deletePost = async () => {
    if (!confirm("Delete this post and all its replies?")) return;
    if (attachments.length > 0) {
      await supabase.storage.from("community").remove(attachments.map((a) => a.storage_path));
    }
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["community", groupId] });
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["community", groupId] });
  };

  const renderComment = (c: any, depth = 0): React.ReactNode => {
    const isMine = c.member_id === currentMemberId;
    const kids = childrenOf(c.id);
    return (
      <li key={c.id} className="flex items-start gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-[11px] font-medium">
          {memberName(c.member_id).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-background px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium">{memberName(c.member_id)}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                {(isMine || canModerate) && (
                  <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete reply">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
          </div>
          <button
            onClick={() => setReplyTo({ id: c.id, name: memberName(c.member_id) })}
            className="mt-1 ml-3 text-[11px] text-muted-foreground hover:text-primary"
          >
            Reply
          </button>
          {kids.length > 0 && depth < 4 && (
            <ul className="mt-2 space-y-3 border-l-2 border-muted pl-3">
              {kids.map((k) => renderComment(k, depth + 1))}
            </ul>
          )}
          {kids.length > 0 && depth >= 4 && (
            <ul className="mt-2 space-y-3 pl-3">
              {kids.map((k) => renderComment(k, depth + 1))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium">{memberName(post.member_id)}</p>
              <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${meta.tone}`}>
              <meta.icon className="h-3 w-3" />
              {meta.label}
            </span>
            {(isAuthor || canModerate) && (
              <button
                onClick={deletePost}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Delete post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {post.title && <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{post.title}</h3>}
        {post.content && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>
        )}

        <AttachmentGrid attachments={attachments} />

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={toggleLike}
            disabled={liking}
            className={`inline-flex items-center gap-1.5 transition-colors ${myLike ? "text-rose-600" : "hover:text-rose-600"}`}
            aria-label={myLike ? "Unlike" : "Like"}
          >
            <Heart className={`h-4 w-4 ${myLike ? "fill-current" : ""}`} />
            {likes.length > 0 && <span className="text-xs">{likes.length}</span>}
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            aria-expanded={showComments}
          >
            <MessageSquare className="h-4 w-4" />
            {comments.length} {comments.length === 1 ? "reply" : "replies"}
            <span className="text-[10px]">{showComments ? "▴" : "▾"}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <div className="border-t bg-muted/30 px-5 py-4">
          {topLevel.length > 0 && (
            <ul className="space-y-3">
              {topLevel.map((c) => renderComment(c))}
            </ul>
          )}

          <form onSubmit={sendReply} className="mt-3 space-y-2">
            {replyTo && (
              <div className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <span>Replying to <span className="font-medium text-foreground">{replyTo.name}</span></span>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a reply…"}
                maxLength={2000}
                className="bg-background"
              />
              <Button type="submit" size="icon" disabled={!reply.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}
