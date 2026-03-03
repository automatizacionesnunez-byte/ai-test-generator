/*
  Warnings:

  - You are about to drop the column `userId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GenerationHistory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_fkey";

-- DropForeignKey
ALTER TABLE "GenerationHistory" DROP CONSTRAINT "GenerationHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_userId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "GenerationHistory" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Test" DROP COLUMN "userId";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Role";
