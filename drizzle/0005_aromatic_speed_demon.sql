ALTER TABLE "results" ADD COLUMN "edited_by" text;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "edited_utterances" jsonb;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "edited_text" text;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "edited_at" timestamp;