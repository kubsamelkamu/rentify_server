/*
  Warnings:

  - You are about to drop the column `verificationToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationTokenExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "verificationToken",
DROP COLUMN "verificationTokenExpiresAt",
ADD COLUMN     "verificationOtp" TEXT,
ADD COLUMN     "verificationOtpExpiresAt" TIMESTAMP(3);
