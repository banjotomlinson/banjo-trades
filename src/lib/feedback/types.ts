export type FeedbackStatus = "backlog" | "in_progress" | "completed";

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface Feedback {
  id: string;
  authorId: string;
  authorName: string;
  authorIsAdmin: boolean;
  subject: string;
  message: string;
  status: FeedbackStatus;
  attachments: Attachment[];
  voteCount: number;
  hasVoted: boolean;
  createdAt: string;
}

export interface CreateFeedbackInput {
  subject: string;
  message: string;
  files: File[];
  // Caller passes whether the submitter is an admin (read from the
  // database). The store does not derive or persist the admin role itself.
  isAdmin: boolean;
}

export interface FeedbackStore {
  list(): Promise<Feedback[]>;
  create(input: CreateFeedbackInput): Promise<Feedback>;
  vote(id: string): Promise<void>;
  unvote(id: string): Promise<void>;
  setStatus(id: string, status: FeedbackStatus, callerIsAdmin: boolean): Promise<void>;
  delete(id: string, callerIsAdmin: boolean): Promise<void>;
  isPreview(): boolean;
}
