-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'PENDING';
