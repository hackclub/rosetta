CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_user_id" text NOT NULL,
	"auto_translate" boolean DEFAULT false,
	"target_language" text DEFAULT 'EN',
	"prompt_status" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_slack_user_id_unique" UNIQUE("slack_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_user_id" text NOT NULL,
	"xoxp_token" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_tokens_slack_user_id_unique" UNIQUE("slack_user_id")
);
