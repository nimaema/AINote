ALTER TYPE "public"."integration_provider" ADD VALUE 'slack';--> statement-breakpoint
CREATE TABLE "workspace_qa_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" "qa_role" NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "search_text" text;--> statement-breakpoint
ALTER TABLE "workspace_qa_messages" ADD CONSTRAINT "workspace_qa_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_qa_user_idx" ON "workspace_qa_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_share_token_idx" ON "recordings" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "recordings_search_tsv_idx" ON "recordings" USING gin (to_tsvector('english', coalesce("search_text", '')));