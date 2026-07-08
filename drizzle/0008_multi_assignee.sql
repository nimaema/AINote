ALTER TABLE "action_items" ADD COLUMN "assignee_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "assign_all" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: carry the existing single assignee into the new array.
UPDATE "action_items" SET "assignee_ids" = jsonb_build_array("assignee_id") WHERE "assignee_id" IS NOT NULL;