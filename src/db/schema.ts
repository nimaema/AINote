import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  pgEnum,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["admin", "member"]);
export const recordingSourceEnum = pgEnum("recording_source", ["record", "upload"]);
export const recordingStatusEnum = pgEnum("recording_status", [
  "uploaded",
  "transcribing",
  "processing",
  "done",
  "failed",
]);
export const exportTargetEnum = pgEnum("export_target", ["google_docs", "teams"]);
export const exportStatusEnum = pgEnum("export_status", ["pending", "done", "failed"]);
export const qaRoleEnum = pgEnum("qa_role", ["user", "assistant"]);
export const integrationProviderEnum = pgEnum("integration_provider", ["google", "teams"]);

// ─── Auth.js core tables (+ our extensions on users) ──────────────────
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Our additions:
  passwordHash: text("password_hash"), // null for OAuth-only accounts
  role: roleEnum("role").notNull().default("member"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ─── App tables ───────────────────────────────────────────────────────
export const recordings = pgTable(
  "recordings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    source: recordingSourceEnum("source").notNull(),
    storageKey: text("storage_key").notNull(), // object key in MinIO
    mimeType: text("mime_type"),
    durationSec: integer("duration_sec"),
    sizeBytes: integer("size_bytes"),
    status: recordingStatusEnum("status").notNull().default("uploaded"),
    error: text("error"),
    // When true, any signed-in user (not just the owner) can view the
    // transcript, notes, and chat for this recording.
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("recordings_user_idx").on(t.userId, t.createdAt)]
);

export const transcripts = pgTable("transcripts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  assemblyaiId: text("assemblyai_id"),
  language: text("language"),
  text: text("text"),
  // AssemblyAI utterances: [{ speaker, text, start, end }]
  utterances: jsonb("utterances").$type<Utterance[]>(),
  // Owner-defined display names for raw speaker labels, e.g. { "A": "Nima" }.
  // Applied at render/export time; original labels stay in `utterances`.
  speakerNames: jsonb("speaker_names").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const results = pgTable("results", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  summary: text("summary"),
  actionItems: jsonb("action_items").$type<ActionItem[]>(),
  decisions: jsonb("decisions").$type<string[]>(),
  topics: jsonb("topics").$type<string[]>(),
  followUps: jsonb("follow_ups").$type<string[]>(),
  model: text("model"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Chunked transcript embeddings for Q&A retrieval on long recordings.
// bge-small-en-v1.5 → 384 dimensions.
export const transcriptChunks = pgTable(
  "transcript_chunks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recordingId: text("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    content: text("content").notNull(),
    startMs: integer("start_ms"),
    speaker: text("speaker"),
    embedding: vector("embedding", { dimensions: 384 }),
  },
  (t) => [
    index("chunks_recording_idx").on(t.recordingId),
    index("chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const qaMessages = pgTable("qa_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  role: qaRoleEnum("role").notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Citation[]>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Per-user connections for exporting notes (Google Docs OAuth, Teams webhook).
export const integrations = pgTable(
  "integrations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    accountLabel: text("account_label"), // e.g. google email, teams channel name
    config: jsonb("config").$type<Record<string, string>>(), // e.g. { webhookUrl }
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("integrations_user_provider_idx").on(t.userId, t.provider)]
);

export const exports = pgTable("exports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  target: exportTargetEnum("target").notNull(),
  status: exportStatusEnum("status").notNull().default("pending"),
  externalUrl: text("external_url"),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Shared JSON shapes ───────────────────────────────────────────────
export type Utterance = {
  speaker: string;
  text: string;
  start: number; // ms
  end: number; // ms
};

export type ActionItem = {
  task: string;
  owner?: string | null;
  due?: string | null;
};

export type Citation = {
  chunkIdx: number;
  startMs?: number | null;
  speaker?: string | null;
  quote?: string;
};

export type User = typeof users.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type Result = typeof results.$inferSelect;
