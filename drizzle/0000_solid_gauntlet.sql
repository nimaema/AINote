CREATE TYPE "public"."export_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."export_target" AS ENUM('google_docs', 'teams');--> statement-breakpoint
CREATE TYPE "public"."qa_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."recording_source" AS ENUM('record', 'upload');--> statement-breakpoint
CREATE TYPE "public"."recording_status" AS ENUM('uploaded', 'transcribing', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"user_id" text NOT NULL,
	"target" "export_target" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"external_url" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"role" "qa_role" NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"source" "recording_source" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text,
	"duration_sec" integer,
	"size_bytes" integer,
	"status" "recording_status" DEFAULT 'uploaded' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"summary" text,
	"action_items" jsonb,
	"decisions" jsonb,
	"topics" jsonb,
	"follow_ups" jsonb,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"idx" integer NOT NULL,
	"content" text NOT NULL,
	"start_ms" integer,
	"speaker" text,
	"embedding" vector(384)
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"assemblyai_id" text,
	"language" text,
	"text" text,
	"utterances" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"role" "role" DEFAULT 'member' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_messages" ADD CONSTRAINT "qa_messages_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recordings_user_idx" ON "recordings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "chunks_recording_idx" ON "transcript_chunks" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "transcript_chunks" USING hnsw ("embedding" vector_cosine_ops);