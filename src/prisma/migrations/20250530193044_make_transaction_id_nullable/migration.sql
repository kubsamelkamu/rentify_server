-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'ETB',
ALTER COLUMN "transactionId" DROP NOT NULL;
