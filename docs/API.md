# API設計

Base URL: `/`

## 1. ヘルスチェック
- `GET /health`
- 200: `{ "ok": true }`

## 2. イベント
- `GET /events`
- 説明: 有効イベントを表示順で取得
- 200: `[{ eventId, eventCode, eventName, eventOrder }]`

## 3. 費目マスタメンテ
- `GET /expense-categories`
- `POST /expense-categories`
  - body: `{ "expenseCategoryCode": "string", "expenseCategoryName": "string" }`
- `PUT /expense-categories/:expenseCategoryId`
  - body: `{ "expenseCategoryCode"?: "string", "expenseCategoryName"?: "string" }`
- `DELETE /expense-categories/:expenseCategoryId`
  - 論理削除 (`del_flg=true`)

## 4. 予算項目
- `GET /budget-items?fiscalYear=2026&eventCode=1Q&expenseCategoryCode=TRAVEL`
- `POST /budget-items`
  - body:
    - `fiscalYear` (number)
    - `eventId` (uuid)
    - `expenseCategoryId` (uuid)
    - `budgetItemCode` (string)
    - `budgetItemName` (string)
- `PUT /budget-items/:budgetItemId`
- `DELETE /budget-items/:budgetItemId`

制約:
- `fiscalYear + eventId + expenseCategoryId + budgetItemCode` は一意

## 5. 月次予算
- `GET /budget-items/:budgetItemId/budgets`
- `PUT /budget-items/:budgetItemId/budgets`
  - body:
```json
{
  "months": [
    { "fiscalMonth": 1, "budgetAmount": 120000 },
    { "fiscalMonth": 2, "budgetAmount": 0 }
  ]
}
```

制約:
- `fiscalMonth`: 1..12
- `budgetAmount`: 0以上の整数(円)

## 6. 月次実績
- `GET /budget-items/:budgetItemId/actuals`
- `PUT /budget-items/:budgetItemId/actuals`
  - body:
```json
{
  "months": [
    { "fiscalMonth": 1, "actualAmount": 100000 },
    { "fiscalMonth": 2, "actualAmount": 0 }
  ]
}
```

制約:
- `fiscalMonth`: 1..12
- `actualAmount`: 0以上の整数(円)
- `mst_budget_item.actual_finalized_flg = true` の場合は更新不可

## 7. 項目単位の実績確定
- `POST /budget-items/:budgetItemId/finalize-actual`
  - 説明: 項目単位で実績を確定する
  - 処理:
    - `actual_finalized_flg = true`
    - `actual_finalized_date = now()`

- `POST /budget-items/:budgetItemId/unfinalize-actual`
  - 説明: 確定解除(運用で許可する場合のみ)
  - 処理:
    - `actual_finalized_flg = false`
    - `actual_finalized_date = null`

## 8. イベント別グラフデータ
- `GET /reports/event-summary?fiscalYear=2026&eventCode=1Q`
- 説明:
  - 費目別積み上げ用データを返す
  - 実績あり月は実績、未登録月は予算を採用
- 200例:
```json
{
  "fiscalYear": 2026,
  "eventCode": "1Q",
  "series": [
    {
      "expenseCategoryCode": "TRAVEL",
      "expenseCategoryName": "旅費交通費",
      "amount": 350000
    }
  ]
}
```

## 9. エラー仕様
- 400: 入力不正
- 404: 対象なし
- 409: 一意制約違反、または確定済み更新
- 500: サーバ内部エラー

## 10. 実装順の推奨
1. `/budget-items` CRUD
2. `/budget-items/:id/budgets`
3. `/budget-items/:id/actuals`
4. `/budget-items/:id/finalize-actual`
5. `/reports/event-summary`
