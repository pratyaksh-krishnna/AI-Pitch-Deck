-- Old-format decks have no Slide Versions; delete them before reshaping the tables.
DELETE FROM "Slide";
DELETE FROM "Deck";

-- CreateEnum
CREATE TYPE "SlideStatus" AS ENUM ('PENDING', 'BUILDING', 'SCORING', 'REVISING', 'PASSED', 'FLAGGED', 'FAILED');

-- DropIndex
DROP INDEX "Slide_deckId_idx";

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "deckHtml" TEXT,
ADD COLUMN     "theme" JSONB;

-- AlterTable
ALTER TABLE "Slide" DROP COLUMN "content",
DROP COLUMN "imagePrompt",
DROP COLUMN "imageUrl",
DROP COLUMN "title",
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "keyMessage" TEXT NOT NULL,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sectionId" TEXT NOT NULL,
ADD COLUMN     "status" "SlideStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "SlideVersion" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "draft" JSONB NOT NULL,
    "imageUrl" TEXT,
    "score" INTEGER,
    "review" JSONB,
    "lintErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlideVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUsage" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlideVersion_slideId_round_key" ON "SlideVersion"("slideId", "round");

-- CreateIndex
CREATE INDEX "ModelUsage_deckId_idx" ON "ModelUsage"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "Slide_deckId_order_key" ON "Slide"("deckId", "order");

-- AddForeignKey
ALTER TABLE "SlideVersion" ADD CONSTRAINT "SlideVersion_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

