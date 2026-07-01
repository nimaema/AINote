CREATE TYPE "public"."integration_provider" AS ENUM('google', 'teams');--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"account_label" text,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_user_provider_idx" ON "integrations" USING btree ("user_id","provider");