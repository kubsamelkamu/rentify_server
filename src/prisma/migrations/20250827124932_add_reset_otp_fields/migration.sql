-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtp" TEXT,
ADD COLUMN     "resetOtpExpiresAt" TIMESTAMP(3);
