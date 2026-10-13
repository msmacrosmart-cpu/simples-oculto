CREATE TABLE "editorial_ai_jobs" (
	"id" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_article_media" (
	"article_id" text,
	"media_key" text,
	CONSTRAINT "editorial_article_media_pkey" PRIMARY KEY("article_id","media_key")
);
--> statement-breakpoint
CREATE TABLE "editorial_articles" (
	"id" text PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"category_slug" text NOT NULL,
	"status" text NOT NULL,
	"document" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "editorial_categories" (
	"slug" text PRIMARY KEY,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_media" (
	"key" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_settings" (
	"id" text PRIMARY KEY,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "editorial_ai_jobs_owner_time_idx" ON "editorial_ai_jobs" ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "editorial_articles_status_category_idx" ON "editorial_articles" ("status","category_slug");--> statement-breakpoint
ALTER TABLE "editorial_article_media" ADD CONSTRAINT "editorial_article_media_article_id_editorial_articles_id_fkey" FOREIGN KEY ("article_id") REFERENCES "editorial_articles"("id");--> statement-breakpoint
ALTER TABLE "editorial_article_media" ADD CONSTRAINT "editorial_article_media_media_key_editorial_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "editorial_media"("key");--> statement-breakpoint
ALTER TABLE "editorial_articles" ADD CONSTRAINT "editorial_articles_category_slug_editorial_categories_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "editorial_categories"("slug");