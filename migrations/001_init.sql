CREATE TABLE mst_event (
  event_id uuid PRIMARY KEY,
  event_code varchar NOT NULL UNIQUE,
  event_name varchar NOT NULL,
  event_order int,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false
);

CREATE TABLE mst_expense_category (
  expense_category_id uuid PRIMARY KEY,
  expense_category_code varchar NOT NULL UNIQUE,
  expense_category_name varchar NOT NULL,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false
);

CREATE TABLE mst_budget_item (
  budget_item_id uuid PRIMARY KEY,
  fiscal_year int NOT NULL,
  event_id uuid NOT NULL REFERENCES mst_event(event_id),
  expense_category_id uuid NOT NULL REFERENCES mst_expense_category(expense_category_id),
  budget_item_code varchar NOT NULL,
  budget_item_name varchar NOT NULL,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false,
  UNIQUE (event_id, fiscal_year, budget_item_code)
);

CREATE TABLE tr_budget_monthly (
  budget_monthly_id uuid PRIMARY KEY,
  budget_item_id uuid NOT NULL REFERENCES mst_budget_item(budget_item_id),
  fiscal_month int NOT NULL,
  budget_amount numeric,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false
);

CREATE TABLE tr_actual_monthly (
  actual_monthly_id uuid PRIMARY KEY,
  budget_item_id uuid NOT NULL REFERENCES mst_budget_item(budget_item_id),
  fiscal_month int NOT NULL,
  actual_amount numeric,
  status varchar,
  finalized_date timestamptz,
  create_date timestamptz NOT NULL DEFAULT now(),
  update_date timestamptz NOT NULL DEFAULT now(),
  del_flg boolean NOT NULL DEFAULT false
);
