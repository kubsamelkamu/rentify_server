/*
  Warnings:

  - Added the required column `url` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PropertyType" ADD VALUE 'VILLA';

-- AlterTable
ALTER TABLE "PropertyImage" ADD COLUMN     "url" TEXT NOT NULL;
