-- AlterTable
ALTER TABLE "mst_budget_item" ALTER COLUMN "update_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mst_event" ALTER COLUMN "update_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mst_expense_category" ALTER COLUMN "update_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tr_actual_monthly" ALTER COLUMN "update_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tr_budget_monthly" ALTER COLUMN "update_date" DROP DEFAULT;
