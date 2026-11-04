-- AlterTable
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "doctorName" TEXT DEFAULT 'Self';

