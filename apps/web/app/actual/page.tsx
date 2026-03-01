import { DashboardShell } from '../components/DashboardShell';
import {
  MONTHS,
  finalizeActualAction,
  formatYen,
  getBudgetItems,
  getExpenseCategories,
  getEvents,
  resolveContext,
  type SearchParams,
  unfinalizeActualAction,
  updateBudgetItemAction,
  upsertActualTableAction
} from '../lib/dashboard';

type ActualPageProps = {
  searchParams?: SearchParams;
};

export default async function ActualPage({ searchParams }: ActualPageProps) {
  const events = await getEvents();
  const categories = await getExpenseCategories();
  const { fiscalYear, eventCode } = resolveContext(searchParams, events);
  const budgetItems =
    Number.isInteger(fiscalYear) && eventCode ? await getBudgetItems(fiscalYear, eventCode) : [];
  const categoryOptions = Array.from(
    new Map(
      budgetItems.map((item) => [
        item.expenseCategory.expenseCategoryCode,
        {
          expenseCategoryCode: item.expenseCategory.expenseCategoryCode,
          expenseCategoryName: item.expenseCategory.expenseCategoryName
        }
      ])
    ).values()
  ).sort((a, b) => a.expenseCategoryCode.localeCompare(b.expenseCategoryCode));

  const requestedExpenseCategoryCode = searchParams?.expenseCategoryCode ?? '';
  const selectedExpenseCategoryCode = categoryOptions.some(
    (category) => category.expenseCategoryCode === requestedExpenseCategoryCode
  )
    ? requestedExpenseCategoryCode
    : (categoryOptions[0]?.expenseCategoryCode ?? '');
  const filteredBudgetItems = selectedExpenseCategoryCode
    ? budgetItems.filter((item) => item.expenseCategory.expenseCategoryCode === selectedExpenseCategoryCode)
    : [];
  const requestedBudgetItemId = searchParams?.budgetItemId ?? '';
  const selectedBudgetItemId = filteredBudgetItems.some((item) => item.budgetItemId === requestedBudgetItemId)
    ? requestedBudgetItemId
    : (filteredBudgetItems[0]?.budgetItemId ?? '');
  const selectedBudgetItem =
    filteredBudgetItems.find((item) => item.budgetItemId === selectedBudgetItemId) ?? null;

  return (
    <DashboardShell
      currentPath="/actual"
      fiscalYear={fiscalYear}
      eventCode={eventCode}
      message={searchParams?.message}
      error={searchParams?.error}
    >
      <section className="sectionBlock">
        <h2 className="sectionTitle">実績登録（月次一括入力）</h2>
        {budgetItems.length === 0 ? (
          <p className="muted">予算項目はまだありません。</p>
        ) : (
          <>
            <form className="controls itemSelectControls" method="get" action="/actual">
              <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
              <input type="hidden" name="eventCode" value={eventCode} />
              <label>
                <span>費目コード</span>
                <select name="expenseCategoryCode" defaultValue={selectedExpenseCategoryCode}>
                  {categoryOptions.map((category) => (
                    <option key={category.expenseCategoryCode} value={category.expenseCategoryCode}>
                      {category.expenseCategoryCode} - {category.expenseCategoryName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>費目項目</span>
                <select name="budgetItemId" defaultValue={selectedBudgetItemId}>
                  {filteredBudgetItems.map((item) => (
                    <option key={item.budgetItemId} value={item.budgetItemId}>
                      {item.budgetItemCode} - {item.budgetItemName}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">選択</button>
            </form>

            {!selectedBudgetItem ? (
              <p className="muted">選択した費目コードに紐づく費目項目がありません。</p>
            ) : (
              (() => {
                const actualMap = new Map(
                  selectedBudgetItem.actualMonthlies.map((m) => [m.fiscalMonth, m.actualAmount])
                );
                const actualTotal = MONTHS.reduce((sum, month) => sum + (actualMap.get(month) ?? 0), 0);

                return (
                  <div className="itemCard">
                    <div className="itemHeader">
                      <div>
                        <p className="itemCode">{selectedBudgetItem.budgetItemCode}</p>
                        <p className="itemName">{selectedBudgetItem.budgetItemName}</p>
                        <p className="itemMeta">
                          {selectedBudgetItem.expenseCategory.expenseCategoryCode} /{' '}
                          {selectedBudgetItem.expenseCategory.expenseCategoryName}
                        </p>
                      </div>
                      <span
                        className={selectedBudgetItem.actualFinalizedFlg ? 'status finalized' : 'status draft'}
                      >
                        {selectedBudgetItem.actualFinalizedFlg ? '確定済み' : '未確定'}
                      </span>
                    </div>

                    <div className="budgetItemActions">
                      <form className="budgetItemEditForm" action={updateBudgetItemAction}>
                        <input type="hidden" name="returnPath" value="/actual" />
                        <input type="hidden" name="budgetItemId" value={selectedBudgetItem.budgetItemId} />
                        <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                        <input type="hidden" name="eventCode" value={eventCode} />
                        <input type="hidden" name="expenseCategoryCode" value={selectedExpenseCategoryCode} />

                        <select
                          name="expenseCategoryId"
                          defaultValue={selectedBudgetItem.expenseCategory.expenseCategoryId}
                        >
                          {categories.map((category) => (
                            <option key={category.expenseCategoryId} value={category.expenseCategoryId}>
                              {category.expenseCategoryCode}
                            </option>
                          ))}
                        </select>
                        <input name="budgetItemName" defaultValue={selectedBudgetItem.budgetItemName} required />
                        <button type="submit">項目更新</button>
                      </form>
                    </div>

                    <form action={upsertActualTableAction} className="matrixForm">
                      <input type="hidden" name="returnPath" value="/actual" />
                      <input type="hidden" name="budgetItemId" value={selectedBudgetItem.budgetItemId} />
                      <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                      <input type="hidden" name="eventCode" value={eventCode} />
                      <input type="hidden" name="expenseCategoryCode" value={selectedExpenseCategoryCode} />
                      <fieldset className="matrixFieldset" disabled={selectedBudgetItem.actualFinalizedFlg}>
                        <p className="matrixTitle">実績（円）</p>
                        <div className="matrixScroll">
                          <table className="matrixTable">
                            <thead>
                              <tr>
                                {MONTHS.map((month) => (
                                  <th key={month}>{month}月</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {MONTHS.map((month) => (
                                  <td key={month}>
                                    <input
                                      type="number"
                                      min={0}
                                      name={`actual_${month}`}
                                      defaultValue={actualMap.get(month) ?? 0}
                                    />
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr className="matrixTotalRow">
                                <td className="matrixTotalLabel" colSpan={11}>
                                  合計
                                </td>
                                <td className="matrixTotalValue">{formatYen(actualTotal)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <button type="submit" className="tableSave">
                          実績を一括保存
                        </button>
                      </fieldset>
                    </form>

                    <form action={selectedBudgetItem.actualFinalizedFlg ? unfinalizeActualAction : finalizeActualAction}>
                      <input type="hidden" name="returnPath" value="/actual" />
                      <input type="hidden" name="budgetItemId" value={selectedBudgetItem.budgetItemId} />
                      <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                      <input type="hidden" name="eventCode" value={eventCode} />
                      <input type="hidden" name="expenseCategoryCode" value={selectedExpenseCategoryCode} />
                      <button type="submit" className="toggleFinalize">
                        {selectedBudgetItem.actualFinalizedFlg ? '確定解除' : '実績確定'}
                      </button>
                    </form>
                  </div>
                );
              })()
            )}
          </>
        )}
      </section>
    </DashboardShell>
  );
}
