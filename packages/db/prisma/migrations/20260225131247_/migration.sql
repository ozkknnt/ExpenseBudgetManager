/*
  Warnings:

  - You are about to drop the column `finalized_date` on the `tr_actual_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `tr_actual_monthly` table. All the data in the column will be lost.
  - You are about to alter the column `actual_amount` on the `tr_actual_monthly` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Integer`.
  - You are about to alter the column `budget_amount` on the `tr_budget_monthly` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "mst_budget_item" ADD COLUMN     "actual_finalized_date" TIMESTAMP(3),
ADD COLUMN     "actual_finalized_flg" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tr_actual_monthly" DROP COLUMN "finalized_date",
DROP COLUMN "status",
ALTER COLUMN "actual_amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "tr_budget_monthly" ALTER COLUMN "budget_amount" SET DATA TYPE INTEGER;
