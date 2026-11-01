-- Apply the new recurring price to the existing monthly plan.
-- Historical invoices and existing trial/paid period dates remain unchanged.
UPDATE "Plan"
SET "name" = 'Starter',
    "priceMinor" = 150000,
    "currency" = 'PKR',
    "intervalDays" = 30,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'STANDARD_MONTHLY';
