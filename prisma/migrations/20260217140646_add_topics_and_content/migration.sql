-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_documentId_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textContent" TEXT,
ADD COLUMN     "topics" JSONB;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "topic" TEXT,
ALTER COLUMN "documentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
