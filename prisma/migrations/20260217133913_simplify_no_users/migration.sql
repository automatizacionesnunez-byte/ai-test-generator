/*
  Warnings:

  - You are about to drop the column `originalContent` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GenerationHistory` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_fkey";

-- DropForeignKey
ALTER TABLE "GenerationHistory" DROP CONSTRAINT "GenerationHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_userId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "originalContent",
DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "GenerationHistory" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Test" DROP COLUMN "userId",
ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "totalQ" INTEGER NOT NULL DEFAULT 20,
ALTER COLUMN "timeLimit" DROP NOT NULL;

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "QuestionType";

-- DropEnum
DROP TYPE "Role";
