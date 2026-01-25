-- Initial schema for ExpenseBudgetManager

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mst_event (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code varchar NOT NULL,
  event_name varchar NOT NULL,
  event_order int,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_mst_event_event_code UNIQUE (event_code)
);

CREATE TABLE IF NOT EXISTS mst_expense_category (
  expense_category_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_category_code varchar NOT NULL,
  expense_category_name varchar NOT NULL,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_mst_expense_category_code UNIQUE (expense_category_code)
);

CREATE TABLE IF NOT EXISTS mst_budget_item (
  budget_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year int NOT NULL,
  event_id uuid NOT NULL,
  expense_category_id uuid NOT NULL,
  budget_item_code varchar NOT NULL,
  budget_item_name varchar NOT NULL,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_budget_item_event FOREIGN KEY (event_id) REFERENCES mst_event (event_id),
  CONSTRAINT fk_budget_item_expense_category FOREIGN KEY (expense_category_id) REFERENCES mst_expense_category (expense_category_id),
  CONSTRAINT uq_budget_item_year_event_category UNIQUE (fiscal_year, event_id, expense_category_id),
  CONSTRAINT uq_budget_item_year_event_code UNIQUE (fiscal_year, event_id, budget_item_code)
);

CREATE TABLE IF NOT EXISTS tr_budget_monthly (
  budget_monthly_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id uuid NOT NULL,
  fiscal_month int NOT NULL,
  budget_amount numeric NOT NULL,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_budget_monthly_item FOREIGN KEY (budget_item_id) REFERENCES mst_budget_item (budget_item_id),
  CONSTRAINT ck_budget_monthly_fiscal_month CHECK (fiscal_month BETWEEN 1 AND 12),
  CONSTRAINT uq_budget_monthly_item_month UNIQUE (budget_item_id, fiscal_month)
);

CREATE TABLE IF NOT EXISTS tr_actual_monthly (
  actual_monthly_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id uuid NOT NULL,
  fiscal_month int NOT NULL,
  actual_amount numeric NOT NULL,
  status varchar NOT NULL,
  finalized_date timestamptz,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_actual_monthly_item FOREIGN KEY (budget_item_id) REFERENCES mst_budget_item (budget_item_id),
  CONSTRAINT ck_actual_monthly_fiscal_month CHECK (fiscal_month BETWEEN 1 AND 12),
  CONSTRAINT ck_actual_monthly_status CHECK (status IN ('draft', 'finalized')),
  CONSTRAINT uq_actual_monthly_item_month UNIQUE (budget_item_id, fiscal_month)
);
