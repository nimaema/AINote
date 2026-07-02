ALTER TABLE "recordings" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "speaker_names" jsonb;