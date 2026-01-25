CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "mst_event" (
    "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_code" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_order" INTEGER NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "del_flg" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "mst_event_pkey" PRIMARY KEY ("event_id")
);

CREATE UNIQUE INDEX "mst_event_event_code_key" ON "mst_event"("event_code");

CREATE TABLE "mst_expense_category" (
    "expense_category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expense_category_code" TEXT NOT NULL,
    "expense_category_name" TEXT NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "del_flg" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "mst_expense_category_pkey" PRIMARY KEY ("expense_category_id")
);

CREATE UNIQUE INDEX "mst_expense_category_expense_category_code_key" ON "mst_expense_category"("expense_category_code");

CREATE TABLE "mst_budget_item" (
    "budget_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fiscal_year" INTEGER NOT NULL,
    "event_id" UUID NOT NULL,
    "expense_category_id" UUID NOT NULL,
    "budget_item_code" TEXT NOT NULL,
    "budget_item_name" TEXT NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "del_flg" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "mst_budget_item_pkey" PRIMARY KEY ("budget_item_id")
);

CREATE UNIQUE INDEX "uniq_budget_item" ON "mst_budget_item"("fiscal_year", "event_id", "expense_category_id", "budget_item_code");

CREATE TABLE "tr_budget_monthly" (
    "budget_monthly_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_item_id" UUID NOT NULL,
    "fiscal_month" INTEGER NOT NULL,
    "budget_amount" NUMERIC(15,2) NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "del_flg" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "tr_budget_monthly_pkey" PRIMARY KEY ("budget_monthly_id")
);

CREATE UNIQUE INDEX "uniq_budget_monthly" ON "tr_budget_monthly"("budget_item_id", "fiscal_month");

CREATE TABLE "tr_actual_monthly" (
    "actual_monthly_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_item_id" UUID NOT NULL,
    "fiscal_month" INTEGER NOT NULL,
    "actual_amount" NUMERIC(15,2) NOT NULL,
    "status" TEXT NOT NULL,
    "finalized_date" TIMESTAMP(3),
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "del_flg" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "tr_actual_monthly_pkey" PRIMARY KEY ("actual_monthly_id")
);

CREATE UNIQUE INDEX "uniq_actual_monthly" ON "tr_actual_monthly"("budget_item_id", "fiscal_month");

ALTER TABLE "mst_budget_item" ADD CONSTRAINT "mst_budget_item_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "mst_event"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mst_budget_item" ADD CONSTRAINT "mst_budget_item_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "mst_expense_category"("expense_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tr_budget_monthly" ADD CONSTRAINT "tr_budget_monthly_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "mst_budget_item"("budget_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tr_actual_monthly" ADD CONSTRAINT "tr_actual_monthly_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "mst_budget_item"("budget_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
