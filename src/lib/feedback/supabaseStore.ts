"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Attachment,
  CreateFeedbackInput,
  Feedback,
  FeedbackStatus,
  FeedbackStore,
} from "./types";

const BUCKET = "feedback-attachments";

interface DbFeedback {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: FeedbackStatus;
  attachments: Attachment[] | null;
  vote_count: number;
  created_at: string;
  author: { id: string; display_name: string | null; role: string } | null;
}

function rowToFeedback(row: DbFeedback, hasVoted: boolean): Feedback {
  return {
    id: row.id,
    authorId: row.user_id,
    authorName: row.author?.display_name ?? "Anonymous",
    authorIsAdmin: row.author?.role === "admin",
    subject: row.subject,
    message: row.message,
    status: row.status,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    voteCount: row.vote_count,
    hasVoted,
    createdAt: row.created_at,
  };
}

async function uploadAttachments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  files: File[]
): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
      cacheControl: "31536000",
      upsert: false,
      contentType: f.type || "application/octet-stream",
    });
    if (error) throw new Error(`upload failed: ${error.message}`);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    out.push({
      url: pub.publicUrl,
      name: f.name,
      size: f.size,
      type: f.type,
    });
  }
  return out;
}

export const supabaseStore: FeedbackStore = {
  async list(): Promise<Feedback[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [feedbackRes, votesRes] = await Promise.all([
      supabase
        .from("feedback")
        .select(
          `id, user_id, subject, message, status, attachments, vote_count, created_at,
           author:profiles!feedback_user_id_fkey ( id, display_name, role )`
        )
        .order("created_at", { ascending: false }),
      user
        ? supabase
            .from("feedback_votes")
            .select("feedback_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { feedback_id: string }[], error: null }),
    ]);

    if (feedbackRes.error) throw new Error(feedbackRes.error.message);
    const votedSet = new Set(
      (votesRes.data ?? []).map((v: { feedback_id: string }) => v.feedback_id)
    );
    return (feedbackRes.data as unknown as DbFeedback[]).map((row) =>
      rowToFeedback(row, votedSet.has(row.id))
    );
  },

  async create(input: CreateFeedbackInput): Promise<Feedback> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const attachments =
      input.files.length > 0
        ? await uploadAttachments(supabase, user.id, input.files)
        : [];

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: user.id,
        subject: input.subject.trim(),
        message: input.message.trim(),
        attachments,
      })
      .select(
        `id, user_id, subject, message, status, attachments, vote_count, created_at,
         author:profiles!feedback_user_id_fkey ( id, display_name, role )`
      )
      .single();

    if (error) throw new Error(error.message);
    return rowToFeedback(data as unknown as DbFeedback, false);
  },

  async vote(id: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("feedback_votes")
      .insert({ feedback_id: id, user_id: user.id });
    // Ignore duplicate-vote errors (user already voted on this item).
    if (error && error.code !== "23505") throw new Error(error.message);
  },

  async unvote(id: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("feedback_votes")
      .delete()
      .eq("feedback_id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  },

  async setStatus(
    id: string,
    status: FeedbackStatus
    // callerIsAdmin is enforced server-side by the feedback_guard_update
    // trigger + the is_admin() RLS check; no client-side gate needed.
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("feedback")
      .update({ status })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  isPreview() {
    return false;
  },
};
