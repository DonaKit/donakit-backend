-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "asset_format" AS ENUM ('SQUARE_1_1', 'STORY_9_16');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "download_type" AS ENUM ('IMAGE_1_1', 'IMAGE_9_16', 'ZIP_BUNDLE');

-- CreateTable
CREATE TABLE "campaign" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" VARCHAR(100) NOT NULL,
    "edit_token" VARCHAR(100) NOT NULL,
    "institution_id" UUID NOT NULL,
    "patient_name" VARCHAR(255) NOT NULL,
    "blood_type" VARCHAR(10) NOT NULL,
    "donation_type" VARCHAR(50) DEFAULT 'Sangre entera',
    "target_donors" INTEGER,
    "current_donors" INTEGER DEFAULT 0,
    "deadline" DATE,
    "observations" TEXT,
    "generated_copy" TEXT,
    "status" "campaign_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_asset" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "format" "asset_format" NOT NULL,
    "image_url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "campaign_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metric" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "visited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "device_type" VARCHAR(20) DEFAULT 'UNKNOWN',
    "referrer" VARCHAR(50) DEFAULT 'DIRECT',
    "ip_hash" VARCHAR(64),

    CONSTRAINT "campaign_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "download_type" "download_type" NOT NULL,
    "downloaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "ip_hash" VARCHAR(64),

    CONSTRAINT "download_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_item" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "institution_id" UUID,
    "question" VARCHAR(255) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL DEFAULT 'Buenos Aires',
    "phone" VARCHAR(50),
    "whatsapp" VARCHAR(50),
    "email" VARCHAR(100),
    "website_url" TEXT,
    "requirements_url" TEXT,
    "faq_url" TEXT,
    "business_hours" JSONB DEFAULT '{"dias": "Lunes a Viernes", "horario": "08:00 a 12:00"}',
    "specific_requirements" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "institution_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "is_immediate_disqualification" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "requirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_slug_key" ON "campaign"("slug");

-- CreateIndex
CREATE INDEX "idx_campaign_institution" ON "campaign"("institution_id");

-- CreateIndex
CREATE INDEX "idx_campaign_slug" ON "campaign"("slug");

-- CreateIndex
CREATE INDEX "idx_campaign_asset_campaign" ON "campaign_asset"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_campaign_metric_campaign" ON "campaign_metric"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_faq_item_institution" ON "faq_item"("institution_id");

-- CreateIndex
CREATE INDEX "idx_requirement_institution" ON "requirement"("institution_id");

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_asset" ADD CONSTRAINT "campaign_asset_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_metric" ADD CONSTRAINT "campaign_metric_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "download_log" ADD CONSTRAINT "download_log_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "faq_item" ADD CONSTRAINT "faq_item_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
