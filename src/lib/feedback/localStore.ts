import type {
  Attachment,
  CreateFeedbackInput,
  Feedback,
  FeedbackStatus,
  FeedbackStore,
} from "./types";

// localStorage-backed feedback store for the local preview.
// Once the user approves the system, we swap this for a Supabase-backed
// store and migrate the schema. Until then, no DB writes happen.

const STORAGE_KEY = "traderm8_feedback_v1";
const CURRENT_USER_ID = "preview-user";
const CURRENT_USER_NAME = "You (Preview)";

interface Stored {
  feedback: Feedback[];
}

function read(): Stored {
  if (typeof window === "undefined") return { feedback: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ feedback: seeded }));
      return { feedback: seeded };
    }
    const parsed = JSON.parse(raw) as Stored;
    return { feedback: parsed.feedback ?? [] };
  } catch {
    return { feedback: [] };
  }
}

function write(state: Stored) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota — silent fail, the user just won't see persistence
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function seedData(): Feedback[] {
  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  return [
    {
      id: uid(),
      authorId: "seed-1",
      authorName: "Maya R.",
      authorIsAdmin: false,
      subject: "Add 1-minute candles to Session Levels",
      message:
        "Right now Session Levels uses 5m. For scalpers it'd be huge to flip to 1m to nail the exact sweep candle on a London raid.",
      status: "in_progress",
      attachments: [],
      voteCount: 12,
      hasVoted: false,
      createdAt: new Date(now - 2 * day).toISOString(),
    },
    {
      id: uid(),
      authorId: "seed-2",
      authorName: "Dan T.",
      authorIsAdmin: false,
      subject: "Pop-out window for Liquidity Heatmap",
      message:
        "Love the Position Calculator pop-out. Same treatment for the Liquidity Heatmap would be perfect — I want it on monitor 2 next to my chart.",
      status: "backlog",
      attachments: [],
      voteCount: 8,
      hasVoted: false,
      createdAt: new Date(now - 3 * hour).toISOString(),
    },
    {
      id: uid(),
      authorId: "seed-3",
      authorName: "Ari S.",
      authorIsAdmin: false,
      subject: "Dark mode is great but options for accent colour?",
      message:
        "Would love to swap the accent from blue to green or purple. Pure aesthetics — keep up the good work.",
      status: "completed",
      attachments: [],
      voteCount: 5,
      hasVoted: false,
      createdAt: new Date(now - 6 * day).toISOString(),
    },
    {
      id: uid(),
      authorId: "seed-4",
      authorName: "Liam K.",
      authorIsAdmin: false,
      subject: "Bias card for Russell 2000 (RTY)",
      message:
        "NQ + ES are great but RTY is my main read for risk-on/risk-off. Add a 5th bias card and I'm sold.",
      status: "backlog",
      attachments: [],
      voteCount: 3,
      hasVoted: false,
      createdAt: new Date(now - 12 * hour).toISOString(),
    },
    {
      id: uid(),
      authorId: "seed-5",
      authorName: "Priya N.",
      authorIsAdmin: true,
      subject: "Welcome — drop your first feedback below",
      message:
        "We read every single submission. Vote on what others have suggested so we know what to ship next. Screenshots help a lot when something's broken.",
      status: "completed",
      attachments: [],
      voteCount: 14,
      hasVoted: true,
      createdAt: new Date(now - 7 * day).toISOString(),
    },
  ];
}

export const localStore: FeedbackStore = {
  async list() {
    const { feedback } = read();
    return [...feedback].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async create(input: CreateFeedbackInput): Promise<Feedback> {
    const attachments: Attachment[] = [];
    for (const f of input.files) {
      // Cap preview attachments at 1 MB so localStorage doesn't blow up.
      if (f.size > 1024 * 1024) {
        attachments.push({
          url: "",
          name: f.name + " (skipped — preview cap 1 MB)",
          size: f.size,
          type: f.type,
        });
        continue;
      }
      const dataUrl = await fileToDataUrl(f);
      attachments.push({ url: dataUrl, name: f.name, size: f.size, type: f.type });
    }
    const item: Feedback = {
      id: uid(),
      authorId: CURRENT_USER_ID,
      authorName: CURRENT_USER_NAME,
      authorIsAdmin: input.isAdmin, // sourced from profiles.role by caller
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: "backlog",
      attachments,
      voteCount: 0,
      hasVoted: false,
      createdAt: new Date().toISOString(),
    };
    const state = read();
    state.feedback.unshift(item);
    write(state);
    return item;
  },

  async vote(id: string) {
    const state = read();
    const f = state.feedback.find((x) => x.id === id);
    if (!f || f.hasVoted) return;
    f.hasVoted = true;
    f.voteCount += 1;
    write(state);
  },

  async unvote(id: string) {
    const state = read();
    const f = state.feedback.find((x) => x.id === id);
    if (!f || !f.hasVoted) return;
    f.hasVoted = false;
    f.voteCount = Math.max(0, f.voteCount - 1);
    write(state);
  },

  async setStatus(id: string, status: FeedbackStatus, callerIsAdmin: boolean) {
    if (!callerIsAdmin) {
      throw new Error("Only admins can change status");
    }
    const state = read();
    const f = state.feedback.find((x) => x.id === id);
    if (!f) return;
    f.status = status;
    write(state);
  },

  async delete(id: string, callerIsAdmin: boolean) {
    const state = read();
    const f = state.feedback.find((x) => x.id === id);
    if (!f) return;
    if (f.authorId !== CURRENT_USER_ID && !callerIsAdmin) {
      throw new Error("Not allowed");
    }
    state.feedback = state.feedback.filter((x) => x.id !== id);
    write(state);
  },

  isPreview() {
    return true;
  },
};
