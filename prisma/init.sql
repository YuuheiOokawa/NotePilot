-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('free', 'paid');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('idea', 'draft', 'review', 'approved', 'copied', 'posted', 'archived');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SeriesRole" AS ENUM ('free', 'paid', 'summary', 'promo');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('not_checked', 'passed', 'issues_found');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('unverified', 'verified', 'removed');

-- CreateEnum
CREATE TYPE "ReadinessStatus" AS ENUM ('not_ready', 'needs_review', 'ready');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'me',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_groups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_items" (
    "id" TEXT NOT NULL,
    "theme_group_id" TEXT NOT NULL,
    "series_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "role" "SeriesRole" NOT NULL DEFAULT 'free',
    "suggested_price" INTEGER,
    "article_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_articles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idea_id" TEXT,
    "title" TEXT NOT NULL,
    "article_type" "ArticleType" NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "lead" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT NOT NULL DEFAULT '',
    "thumbnail_text" TEXT NOT NULL DEFAULT '',
    "price" INTEGER,
    "sales_title" TEXT,
    "free_scope_note" TEXT,
    "paid_value_note" TEXT,
    "target_reader" TEXT,
    "promo_text" TEXT,
    "theme_group_id" TEXT,
    "series_number" INTEGER,
    "series_role" "SeriesRole",
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "post_frequency_group" TEXT,
    "quality_score" INTEGER,
    "typo_check_status" "CheckStatus" NOT NULL DEFAULT 'not_checked',
    "fact_check_status" "CheckStatus" NOT NULL DEFAULT 'not_checked',
    "has_unverified_claims" BOOLEAN NOT NULL DEFAULT false,
    "review_notes" TEXT NOT NULL DEFAULT '',
    "publish_readiness_status" "ReadinessStatus" NOT NULL DEFAULT 'not_ready',
    "note_url" TEXT,
    "note_post_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_claims" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" "ClaimStatus" NOT NULL DEFAULT 'unverified',
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "result_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_ideas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "suggested_type" "ArticleType" NOT NULL DEFAULT 'free',
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_sections" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 2,
    "content" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_logs" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "article_id" TEXT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT '',
    "genres" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "ai_provider" TEXT NOT NULL DEFAULT 'mock',
    "ai_model" TEXT NOT NULL DEFAULT 'claude-opus-4-8',
    "note_account_url" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_items_article_id_key" ON "series_items"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");

-- AddForeignKey
ALTER TABLE "theme_groups" ADD CONSTRAINT "theme_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_items" ADD CONSTRAINT "series_items_theme_group_id_fkey" FOREIGN KEY ("theme_group_id") REFERENCES "theme_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_items" ADD CONSTRAINT "series_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_articles" ADD CONSTRAINT "note_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_articles" ADD CONSTRAINT "note_articles_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "article_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_articles" ADD CONSTRAINT "note_articles_theme_group_id_fkey" FOREIGN KEY ("theme_group_id") REFERENCES "theme_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_claims" ADD CONSTRAINT "fact_claims_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_ideas" ADD CONSTRAINT "article_ideas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_sections" ADD CONSTRAINT "article_sections_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_logs" ADD CONSTRAINT "revenue_logs_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "note_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

