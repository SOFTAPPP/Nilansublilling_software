-- Migration: Update Party table for billing overhaul
-- Adds: proprietorName, aadharNumber, bankName, bankAccountNo, bankIfsc
-- Removes: gstin (after copying data)

-- Step 1: Add new columns
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "proprietorName" TEXT DEFAULT '';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "aadharNumber" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "bankName" TEXT DEFAULT '';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT DEFAULT '';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "bankIfsc" TEXT DEFAULT '';

-- Step 2: Add orderDate to Bill table (for credit bills)
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "orderDate" TIMESTAMP;

-- Step 3: Drop gstin column (optional - uncomment if you want to remove it)
-- ALTER TABLE "Party" DROP COLUMN IF EXISTS "gstin";

-- Done
SELECT 'Migration completed successfully' as status;
