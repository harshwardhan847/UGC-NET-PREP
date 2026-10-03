-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN "source" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "timeSpent" INTEGER;

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN "duration" INTEGER;
ALTER TABLE "QuizSession" ADD COLUMN "paper" TEXT;
ALTER TABLE "QuizSession" ADD COLUMN "title" TEXT;

-- CreateTable
CREATE TABLE "Bookmark" (
    "questionId" TEXT NOT NULL PRIMARY KEY,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Attempt_questionId_createdAt_idx" ON "Attempt"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_createdAt_idx" ON "Attempt"("createdAt");
