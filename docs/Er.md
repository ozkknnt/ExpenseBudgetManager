# ER図

前提:
- 年度は `mst_budget_item.fiscal_year` で管理
- 金額は円単位の整数
- 実績確定は項目単位 (`mst_budget_item.actual_finalized_flg`)

```mermaid
erDiagram
  mst_event {
    uuid event_id PK                  "イベントID"
    varchar event_code                "イベントコード(UNIQUE)"
    varchar event_name                "イベント名"
    int event_order                   "表示順"
    timestamptz create_date           "初期作成日時"
    timestamptz update_date           "更新日時"
    boolean del_flg                   "削除フラグ"
  }

  mst_expense_category {
    uuid expense_category_id PK       "費目ID"
    varchar expense_category_code     "費目コード(UNIQUE)"
    varchar expense_category_name     "費目名称"
    timestamptz create_date           "初期作成日時"
    timestamptz update_date           "更新日時"
    boolean del_flg                   "削除フラグ"
  }

  mst_budget_item {
    uuid budget_item_id PK            "予算項目ID"
    int fiscal_year                   "年度(例:2026)"
    uuid event_id FK                  "イベントID(FK)"
    uuid expense_category_id FK       "費目ID(FK)"
    varchar budget_item_code          "予算項目コード"
    varchar budget_item_name          "予算項目名称"
    boolean actual_finalized_flg      "実績確定フラグ(項目単位)"
    timestamptz actual_finalized_date "実績確定日時"
    timestamptz create_date           "初期作成日時"
    timestamptz update_date           "更新日時"
    boolean del_flg                   "削除フラグ"
  }

  tr_budget_monthly {
    uuid budget_monthly_id PK         "予算月次ID"
    uuid budget_item_id FK            "予算項目ID(FK)"
    int fiscal_month                  "計上月(1-12)"
    int budget_amount                 "予算金額(円/整数)"
    timestamptz create_date           "初期作成日時"
    timestamptz update_date           "更新日時"
    boolean del_flg                   "削除フラグ"
  }

  tr_actual_monthly {
    uuid actual_monthly_id PK         "実績月次ID"
    uuid budget_item_id FK            "予算項目ID(FK)"
    int fiscal_month                  "計上月(1-12)"
    int actual_amount                 "実績金額(円/整数)"
    timestamptz create_date           "初期作成日時"
    timestamptz update_date           "更新日時"
    boolean del_flg                   "削除フラグ"
  }

  mst_event ||--o{ mst_budget_item : "イベント-予算項目"
  mst_expense_category ||--o{ mst_budget_item : "費目-予算項目"
  mst_budget_item ||--o{ tr_budget_monthly : "予算項目-予算(月次)"
  mst_budget_item ||--o{ tr_actual_monthly : "予算項目-実績(月次)"
```

## 主要制約
- `mst_event.event_code` は一意
- `mst_expense_category.expense_category_code` は一意
- `mst_budget_item(fiscal_year, event_id, expense_category_id, budget_item_code)` は一意
- `tr_budget_monthly(budget_item_id, fiscal_month)` は一意
- `tr_actual_monthly(budget_item_id, fiscal_month)` は一意
- `fiscal_month` は 1..12
