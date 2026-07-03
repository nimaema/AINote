CREATE TYPE "public"."action_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."notif_type" AS ENUM('assigned', 'mentioned', 'shared', 'commented', 'project_added');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"task" text NOT NULL,
	"owner_label" text,
	"assignee_id" text,
	"due_label" text,
	"status" "action_status" DEFAULT 'open' NOT NULL,
	"source_ms" integer,
	"order_idx" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"start_ms" integer,
	"body" text NOT NULL,
	"mentions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notif_type" NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"recording_id" text,
	"project_id" text,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_role" DEFAULT 'editor' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_recording_idx" ON "action_items" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "action_assignee_idx" ON "action_items" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "comments_recording_idx" ON "comments" USING btree ("recording_id","created_at");--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");