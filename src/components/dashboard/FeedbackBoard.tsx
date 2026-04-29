"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseStore } from "@/lib/feedback/supabaseStore";
import type { Feedback, FeedbackStatus } from "@/lib/feedback/types";
import { createClient } from "@/lib/supabase/client";

const store = supabaseStore;

const COLUMNS: { key: FeedbackStatus; label: string; tone: string; bar: string }[] = [
  { key: "backlog", label: "Backlog", tone: "text-[#94a3b8]", bar: "bg-[#475569]" },
  { key: "in_progress", label: "In Progress", tone: "text-blue-400", bar: "bg-blue-500" },
  { key: "completed", label: "Completed", tone: "text-green-400", bar: "bg-green-500" },
];

const STATUS_PILL: Record<FeedbackStatus, string> = {
  backlog: "bg-slate-500/15 text-slate-300",
  in_progress: "bg-blue-500/15 text-blue-400",
  completed: "bg-green-500/15 text-green-400",
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  completed: "Completed",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = 60_000, h = 60 * m, d = 24 * h;
  if (diff < m) return "just now";
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  return `${Math.floor(diff / d)}d ago`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function FeedbackBoard() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [openItem, setOpenItem] = useState<Feedback | null>(null);

  const refresh = useCallback(async () => {
    const list = await store.list();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Admin role is sourced from public.profiles.role — backend-only field.
      // The app cannot change this anywhere; it's set via SQL during the
      // 003_user_roles migration and lives only in the database.
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          await refresh();
        }
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(profile?.role === "admin");
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const grouped = useMemo(() => {
    const out: Record<FeedbackStatus, Feedback[]> = {
      backlog: [],
      in_progress: [],
      completed: [],
    };
    for (const f of items) out[f.status].push(f);
    for (const k of Object.keys(out) as FeedbackStatus[]) {
      out[k].sort((a, b) => b.voteCount - a.voteCount);
    }
    return out;
  }, [items]);

  async function toggleVote(f: Feedback) {
    if (f.hasVoted) await store.unvote(f.id);
    else await store.vote(f.id);
    await refresh();
  }

  async function changeStatus(f: Feedback, status: FeedbackStatus) {
    await store.setStatus(f.id, status, isAdmin);
    await refresh();
    if (openItem && openItem.id === f.id) {
      setOpenItem({ ...f, status });
    }
  }

  async function deleteItem(f: Feedback) {
    if (!confirm(`Delete "${f.subject}"?`)) return;
    await store.delete(f.id, isAdmin);
    setOpenItem(null);
    await refresh();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#f1f5f9]">Feedback</h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Vote on what to ship next, see what&apos;s in progress, and submit your own ideas.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New feedback
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col min-h-[240px]">
            <div className={`h-1 ${col.bar}`} />
            <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${col.tone}`}>
                  {col.label}
                </span>
                <span className="text-[11px] text-[#64748b] tabular-nums">
                  {grouped[col.key].length}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-2.5 flex-1">
              {loading ? (
                <div className="text-[#64748b] text-xs text-center py-6">Loading...</div>
              ) : grouped[col.key].length === 0 ? (
                <div className="text-[#475569] text-xs text-center py-6 italic">
                  Nothing in {col.label.toLowerCase()} yet
                </div>
              ) : (
                grouped[col.key].map((f) => (
                  <FeedbackCard
                    key={f.id}
                    item={f}
                    onClick={() => setOpenItem(f)}
                    onVote={() => toggleVote(f)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <FeedbackForm
          isAdmin={isAdmin}
          onClose={() => setShowForm(false)}
          onSubmitted={async () => {
            setShowForm(false);
            await refresh();
          }}
        />
      )}

      {openItem && (
        <FeedbackDetail
          item={openItem}
          isAdmin={isAdmin}
          onClose={() => setOpenItem(null)}
          onVote={() => toggleVote(openItem).then(refresh)}
          onStatusChange={(s) => changeStatus(openItem, s)}
          onDelete={() => deleteItem(openItem)}
        />
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────
function FeedbackCard({
  item,
  onClick,
  onVote,
}: {
  item: Feedback;
  onClick: () => void;
  onVote: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group bg-[#0f172a] hover:bg-[#131f35] border border-[#1e293b] hover:border-[#334155] rounded-lg p-3 cursor-pointer transition-all"
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote();
          }}
          className={`shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded border transition-colors ${
            item.hasVoted
              ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
              : "bg-[#0f172a] border-[#1e293b] text-[#64748b] group-hover:border-[#334155] group-hover:text-[#94a3b8]"
          }`}
          title={item.hasVoted ? "Remove vote" : "Vote"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <span className="text-[11px] font-bold tabular-nums leading-none">
            {item.voteCount}
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white leading-tight line-clamp-2">
            {item.subject}
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
            {item.message}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] text-[#475569]">
              {item.authorName}
              {item.authorIsAdmin && (
                <span className="ml-1.5 px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold text-[8px] uppercase tracking-wider">
                  Admin
                </span>
              )}
            </span>
            <span className="text-[10px] text-[#475569]">·</span>
            <span className="text-[10px] text-[#475569]">{timeAgo(item.createdAt)}</span>
            {item.attachments.length > 0 && (
              <>
                <span className="text-[10px] text-[#475569]">·</span>
                <span className="text-[10px] text-[#64748b] inline-flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  {item.attachments.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Submission form ──────────────────────────────────────────────
function FeedbackForm({
  isAdmin,
  onClose,
  onSubmitted,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjectOk = subject.trim().length >= 3 && subject.trim().length <= 200;
  const messageOk = message.trim().length >= 5 && message.trim().length <= 5000;
  const canSubmit = subjectOk && messageOk && !submitting;

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr].slice(0, 6));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await store.create({
        subject: subject.trim(),
        message: message.trim(),
        files,
        isAdmin,
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-[#1e293b] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">New feedback</h3>
          <button onClick={onClose} className="text-[#64748b] hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick summary of your feedback"
              maxLength={200}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6]"
              autoFocus
            />
            <div className="text-[10px] text-[#475569] mt-1 text-right">{subject.length}/200</div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to see, or what's broken?"
              rows={6}
              maxLength={5000}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] resize-y"
            />
            <div className="text-[10px] text-[#475569] mt-1 text-right">
              {message.length}/5000
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1.5">
              Screenshots / attachments (optional)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#1e293b] hover:border-[#3b82f6] bg-[#111827] rounded-md p-4 text-center cursor-pointer transition-colors"
            >
              <div className="text-xs text-[#94a3b8]">
                <strong className="text-white">Click to upload</strong> or drag and drop
              </div>
              <div className="text-[10px] text-[#475569] mt-1">PNG, JPG, GIF, PDF up to 10 MB each</div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                className="hidden"
              />
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#111827] border border-[#1e293b] rounded px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-[#64748b] uppercase font-bold">
                        {f.type.startsWith("image/") ? "IMG" : "FILE"}
                      </span>
                      <span className="text-xs text-[#e2e8f0] truncate">{f.name}</span>
                      <span className="text-[10px] text-[#475569] shrink-0">{fmtBytes(f.size)}</span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-[#64748b] hover:text-red-400 text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="px-5 py-3 border-t border-[#1e293b] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-[#94a3b8] hover:text-white px-4 py-2 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#1e293b] disabled:text-[#475569] text-white font-semibold text-sm px-4 py-2 rounded-md transition-colors"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ─────────────────────────────────────────────────
function FeedbackDetail({
  item,
  isAdmin,
  onClose,
  onVote,
  onStatusChange,
  onDelete,
}: {
  item: Feedback;
  isAdmin: boolean;
  onClose: () => void;
  onVote: () => void;
  onStatusChange: (s: FeedbackStatus) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-[#1e293b] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between gap-3">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${STATUS_PILL[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
          <button onClick={onClose} className="text-[#64748b] hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">{item.subject}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-[#94a3b8]">
                by {item.authorName}
                {item.authorIsAdmin && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold text-[9px] uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </span>
              <span className="text-xs text-[#475569]">·</span>
              <span className="text-xs text-[#475569]">{timeAgo(item.createdAt)}</span>
              <span className="text-xs text-[#475569]">·</span>
              <button
                onClick={onVote}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                  item.hasVoted
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                    : "bg-[#0f172a] border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
                <span className="tabular-nums">{item.voteCount}</span>
                <span>{item.voteCount === 1 ? "vote" : "votes"}</span>
              </button>
            </div>
          </div>

          <div className="text-sm text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">
            {item.message}
          </div>

          {item.attachments.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-2">
                Attachments
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#111827] border border-[#1e293b] rounded-md overflow-hidden hover:border-[#334155] transition-colors"
                    onClick={(e) => !a.url && e.preventDefault()}
                  >
                    {a.type.startsWith("image/") && a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="h-24 flex items-center justify-center bg-[#0f172a] text-[10px] text-[#64748b] uppercase font-bold">
                        {a.type.split("/")[1] ?? "file"}
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <div className="text-[11px] text-[#e2e8f0] truncate" title={a.name}>
                        {a.name}
                      </div>
                      <div className="text-[10px] text-[#475569]">{fmtBytes(a.size)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="pt-3 border-t border-[#1e293b]">
              <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-2">
                Admin controls
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[#64748b] mr-1">Set status:</span>
                {(["backlog", "in_progress", "completed"] as FeedbackStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    disabled={item.status === s}
                    className={`text-xs font-semibold px-3 py-1 rounded border transition-colors ${
                      item.status === s
                        ? `${STATUS_PILL[s]} border-transparent cursor-default`
                        : "bg-transparent border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
                <span className="flex-1" />
                <button
                  onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1 rounded border border-red-500/30 hover:border-red-500/50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
