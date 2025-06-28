-- CreateTable
CREATE TABLE "LandlordDoc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,

    CONSTRAINT "LandlordDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandlordDoc_userId_status_idx" ON "LandlordDoc"("userId", "status");

-- AddForeignKey
ALTER TABLE "LandlordDoc" ADD CONSTRAINT "LandlordDoc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
