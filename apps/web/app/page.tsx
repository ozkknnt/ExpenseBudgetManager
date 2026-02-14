import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ConfirmSubmitButton } from './components/ConfirmSubmitButton';

type EventItem = {
  eventId: string;
  eventCode: string;
  eventName: string;
  eventOrder: number;
};

type ExpenseCategory = {
  expenseCategoryId: string;
  expenseCategoryCode: string;
  expenseCategoryName: string;
};

type MonthlyBudget = {
  fiscalMonth: number;
  budgetAmount: number;
};

type MonthlyActual = {
  fiscalMonth: number;
  actualAmount: number;
};

type BudgetItem = {
  budgetItemId: string;
  fiscalYear: number;
  budgetItemCode: string;
  budgetItemName: string;
  actualFinalizedFlg: boolean;
  event: EventItem;
  expenseCategory: ExpenseCategory;
  budgetMonthlies: MonthlyBudget[];
  actualMonthlies: MonthlyActual[];
};

type EventSummaryPoint = {
  expenseCategoryCode: string;
  expenseCategoryName: string;
  amount: number;
};

type EventSummary = {
  fiscalYear: number;
  eventCode: string;
  series: EventSummaryPoint[];
};

type HomeProps = {
  searchParams?: {
    fiscalYear?: string;
    eventCode?: string;
    message?: string;
    error?: string;
  };
};

const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
}

function buildQuery(params: { fiscalYear: number; eventCode: string; message?: string; error?: string }) {
  const query = new URLSearchParams({
    fiscalYear: String(params.fiscalYear),
    eventCode: params.eventCode
  });

  if (params.message) {
    query.set('message', params.message);
  }

  if (params.error) {
    query.set('error', params.error);
  }

  return query.toString();
}

function parseMonthlyAmounts(formData: FormData, prefix: 'budget' | 'actual') {
  const months: Array<{ fiscalMonth: number; amount: number }> = [];

  for (const month of MONTHS) {
    const raw = Number(formData.get(`${prefix}_${month}`));
    if (!Number.isInteger(raw) || raw < 0) {
      return null;
    }
    months.push({ fiscalMonth: month, amount: raw });
  }

  return months;
}

async function callApi(path: string, init?: RequestInit) {
  return fetch(`${getBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
}

async function getEvents(): Promise<EventItem[]> {
  const res = await fetch(`${getBaseUrl()}/events`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await fetch(`${getBaseUrl()}/expense-categories`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

async function getBudgetItems(fiscalYear: number, eventCode: string): Promise<BudgetItem[]> {
  const params = new URLSearchParams({
    fiscalYear: String(fiscalYear),
    eventCode
  });

  const res = await fetch(`${getBaseUrl()}/budget-items?${params.toString()}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

async function getEventSummary(
  fiscalYear: number,
  eventCode: string
): Promise<EventSummary | null> {
  const params = new URLSearchParams({
    fiscalYear: String(fiscalYear),
    eventCode
  });

  const res = await fetch(`${getBaseUrl()}/reports/event-summary?${params.toString()}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

function formatYen(amount: number) {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

async function createExpenseCategoryAction(formData: FormData) {
  'use server';

  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryCode = String(formData.get('expenseCategoryCode') ?? '').trim();
  const expenseCategoryName = String(formData.get('expenseCategoryName') ?? '').trim();

  if (!expenseCategoryCode || !expenseCategoryName) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '費目コードと費目名は必須です' })}`);
  }

  const res = await callApi('/expense-categories', {
    method: 'POST',
    body: JSON.stringify({
      expenseCategoryCode,
      expenseCategoryName
    })
  });

  if (!res.ok) {
    const message = res.status === 409 ? '費目コードが重複しています' : '費目の作成に失敗しました';
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: message })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '費目を作成しました' })}`);
}

async function updateExpenseCategoryAction(formData: FormData) {
  'use server';

  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const expenseCategoryCode = String(formData.get('expenseCategoryCode') ?? '').trim();
  const expenseCategoryName = String(formData.get('expenseCategoryName') ?? '').trim();

  if (!expenseCategoryId || !expenseCategoryCode || !expenseCategoryName) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '費目更新の入力が不足しています' })}`);
  }

  const res = await callApi(`/expense-categories/${expenseCategoryId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expenseCategoryCode,
      expenseCategoryName
    })
  });

  if (!res.ok) {
    const message = res.status === 409 ? '費目コードが重複しています' : '費目の更新に失敗しました';
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: message })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '費目を更新しました' })}`);
}

async function deleteExpenseCategoryAction(formData: FormData) {
  'use server';

  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');

  if (!expenseCategoryId) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '費目IDが不正です' })}`);
  }

  const res = await callApi(`/expense-categories/${expenseCategoryId}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '費目の削除に失敗しました' })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '費目を削除しました' })}`);
}

async function createBudgetItemAction(formData: FormData) {
  'use server';

  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const budgetItemCode = String(formData.get('budgetItemCode') ?? '').trim();
  const budgetItemName = String(formData.get('budgetItemName') ?? '').trim();

  if (
    !Number.isInteger(fiscalYear) ||
    !eventCode ||
    !eventId ||
    !expenseCategoryId ||
    !budgetItemCode ||
    !budgetItemName
  ) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '必須項目を入力してください' })}`);
  }

  const res = await callApi('/budget-items', {
    method: 'POST',
    body: JSON.stringify({
      fiscalYear,
      eventId,
      expenseCategoryId,
      budgetItemCode,
      budgetItemName
    })
  });

  if (!res.ok) {
    const errorText = res.status === 409 ? '重複する予算項目コードです' : '予算項目の作成に失敗しました';
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: errorText })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '予算項目を作成しました' })}`);
}


async function updateBudgetItemAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const budgetItemCode = String(formData.get('budgetItemCode') ?? '').trim();
  const budgetItemName = String(formData.get('budgetItemName') ?? '').trim();

  if (!budgetItemId || !expenseCategoryId || !budgetItemCode || !budgetItemName) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '予算項目更新の入力が不足しています' })}`);
  }

  const res = await callApi(`/budget-items/${budgetItemId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expenseCategoryId,
      budgetItemCode,
      budgetItemName
    })
  });

  if (!res.ok) {
    const message = res.status === 409 ? '重複する予算項目コードです' : '予算項目の更新に失敗しました';
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: message })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '予算項目を更新しました' })}`);
}

async function deleteBudgetItemAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  if (!budgetItemId) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '予算項目IDが不正です' })}`);
  }

  const res = await callApi(`/budget-items/${budgetItemId}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '予算項目の削除に失敗しました' })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '予算項目を削除しました' })}`);
}
async function upsertBudgetTableAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const rows = parseMonthlyAmounts(formData, 'budget');
  if (!rows) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '予算は0以上の整数で入力してください' })}`);
  }

  const res = await callApi(`/budget-items/${budgetItemId}/budgets`, {
    method: 'PUT',
    body: JSON.stringify({
      months: rows.map((row) => ({ fiscalMonth: row.fiscalMonth, budgetAmount: row.amount }))
    })
  });

  if (!res.ok) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '予算一括保存に失敗しました' })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '予算を一括更新しました' })}`);
}

async function upsertActualTableAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const rows = parseMonthlyAmounts(formData, 'actual');
  if (!rows) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '実績は0以上の整数で入力してください' })}`);
  }

  const res = await callApi(`/budget-items/${budgetItemId}/actuals`, {
    method: 'PUT',
    body: JSON.stringify({
      months: rows.map((row) => ({ fiscalMonth: row.fiscalMonth, actualAmount: row.amount }))
    })
  });

  if (!res.ok) {
    const errorText = res.status === 409 ? 'この項目は実績確定済みです' : '実績一括保存に失敗しました';
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: errorText })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '実績を一括更新しました' })}`);
}

async function finalizeActualAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const res = await callApi(`/budget-items/${budgetItemId}/finalize-actual`, {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '確定に失敗しました' })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '実績を確定しました' })}`);
}

async function unfinalizeActualAction(formData: FormData) {
  'use server';

  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const res = await callApi(`/budget-items/${budgetItemId}/unfinalize-actual`, {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirect(`/?${buildQuery({ fiscalYear, eventCode, error: '確定解除に失敗しました' })}`);
  }

  revalidatePath('/');
  redirect(`/?${buildQuery({ fiscalYear, eventCode, message: '実績確定を解除しました' })}`);
}

export default async function Home({ searchParams }: HomeProps) {
  const events = await getEvents();
  const categories = await getExpenseCategories();

  const currentYear = new Date().getFullYear();
  const fiscalYear = Number(searchParams?.fiscalYear ?? currentYear);
  const selectedEventCode =
    searchParams?.eventCode ?? (events.length > 0 ? events[0].eventCode : '');

  const [summary, budgetItems] = await Promise.all([
    Number.isInteger(fiscalYear) && selectedEventCode
      ? getEventSummary(fiscalYear, selectedEventCode)
      : Promise.resolve(null),
    Number.isInteger(fiscalYear) && selectedEventCode
      ? getBudgetItems(fiscalYear, selectedEventCode)
      : Promise.resolve([])
  ]);

  const selectedEvent = events.find((event) => event.eventCode === selectedEventCode);
  const series = summary?.series ?? [];
  const maxAmount = series.reduce((max, row) => Math.max(max, row.amount), 0);

  return (
    <main className="page">
      <section className="card">
        <p className="badge">monorepo bootstrap succeeded</p>
        <h1>Expense Budget Manager</h1>

        <form className="controls" method="get">
          <label>
            <span>年度</span>
            <input
              type="number"
              name="fiscalYear"
              defaultValue={Number.isInteger(fiscalYear) ? fiscalYear : currentYear}
              min={2000}
              max={2100}
            />
          </label>

          <label>
            <span>イベント</span>
            <select name="eventCode" defaultValue={selectedEventCode}>
              {events.map((event) => (
                <option key={event.eventId} value={event.eventCode}>
                  {event.eventCode}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">表示</button>
        </form>

        {searchParams?.message && <p className="notice success">{searchParams.message}</p>}
        {searchParams?.error && <p className="notice error">{searchParams.error}</p>}

        <p className="sub">API: /reports/event-summary</p>

        {summary === null ? (
          <p className="muted">集計データを取得できませんでした。</p>
        ) : series.length === 0 ? (
          <p className="muted">対象データがありません。</p>
        ) : (
          <ul className="chartList">
            {series.map((row) => {
              const ratio = maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0;
              return (
                <li key={row.expenseCategoryCode}>
                  <div className="chartMeta">
                    <span className="code">{row.expenseCategoryCode}</span>
                    <span>{row.expenseCategoryName}</span>
                    <span className="amount">{formatYen(row.amount)} 円</span>
                  </div>
                  <div className="barTrack">
                    <div className="barFill" style={{ width: `${Math.max(ratio, 2)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <hr className="divider" />

        <h2>費目マスタメンテ</h2>
        <form className="createForm categoryCreateForm" action={createExpenseCategoryAction}>
          <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
          <input type="hidden" name="eventCode" value={selectedEventCode} />

          <label>
            <span>費目コード</span>
            <input name="expenseCategoryCode" required maxLength={50} />
          </label>

          <label>
            <span>費目名</span>
            <input name="expenseCategoryName" required maxLength={100} />
          </label>

          <button type="submit">費目追加</button>
        </form>

        <ul className="categoryList">
          {categories.map((category) => (
            <li key={category.expenseCategoryId} className="categoryRow">
              <form className="categoryEditForm" action={updateExpenseCategoryAction}>
                <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                <input type="hidden" name="eventCode" value={selectedEventCode} />
                <input type="hidden" name="expenseCategoryId" value={category.expenseCategoryId} />
                <input name="expenseCategoryCode" defaultValue={category.expenseCategoryCode} required />
                <input name="expenseCategoryName" defaultValue={category.expenseCategoryName} required />
                <button type="submit">更新</button>
              </form>

              <form action={deleteExpenseCategoryAction}>
                <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                <input type="hidden" name="eventCode" value={selectedEventCode} />
                <input type="hidden" name="expenseCategoryId" value={category.expenseCategoryId} />
                <ConfirmSubmitButton
                    label="削除"
                    className="dangerButton"
                    confirmMessage="この費目を削除します。よろしいですか？"
                  />
              </form>
            </li>
          ))}
        </ul>

        <hr className="divider" />

        <h2>予算項目を追加</h2>
        <form className="createForm" action={createBudgetItemAction}>
          <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
          <input type="hidden" name="eventCode" value={selectedEventCode} />
          <input type="hidden" name="eventId" value={selectedEvent?.eventId ?? ''} />

          <label>
            <span>費目</span>
            <select name="expenseCategoryId" required>
              <option value="">選択してください</option>
              {categories.map((category) => (
                <option key={category.expenseCategoryId} value={category.expenseCategoryId}>
                  {category.expenseCategoryCode} - {category.expenseCategoryName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>予算項目コード</span>
            <input name="budgetItemCode" required maxLength={50} />
          </label>

          <label>
            <span>予算項目名</span>
            <input name="budgetItemName" required maxLength={100} />
          </label>

          <button type="submit">作成</button>
        </form>

        <h2>予算項目メンテ（月次一括入力）</h2>
        {budgetItems.length === 0 ? (
          <p className="muted">予算項目はまだありません。</p>
        ) : (
          <ul className="itemList">
            {budgetItems.map((item) => {
              const budgetMap = new Map(item.budgetMonthlies.map((m) => [m.fiscalMonth, m.budgetAmount]));
              const actualMap = new Map(item.actualMonthlies.map((m) => [m.fiscalMonth, m.actualAmount]));
              const budgetTotal = MONTHS.reduce((sum, month) => sum + (budgetMap.get(month) ?? 0), 0);
              const actualTotal = MONTHS.reduce((sum, month) => sum + (actualMap.get(month) ?? 0), 0);

              return (
                <li key={item.budgetItemId} className="itemCard">
                  <div className="itemHeader">
                    <div>
                      <p className="itemCode">{item.budgetItemCode}</p>
                      <p className="itemName">{item.budgetItemName}</p>
                      <p className="itemMeta">
                        {item.expenseCategory.expenseCategoryCode} / {item.expenseCategory.expenseCategoryName}
                      </p>
                    </div>
                    <span className={item.actualFinalizedFlg ? 'status finalized' : 'status draft'}>
                      {item.actualFinalizedFlg ? '確定済み' : '未確定'}
                    </span>
                  </div>


                  <div className="budgetItemActions">
                    <form className="budgetItemEditForm" action={updateBudgetItemAction}>
                      <input type="hidden" name="budgetItemId" value={item.budgetItemId} />
                      <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                      <input type="hidden" name="eventCode" value={selectedEventCode} />

                      <select name="expenseCategoryId" defaultValue={item.expenseCategory.expenseCategoryId}>
                        {categories.map((category) => (
                          <option key={category.expenseCategoryId} value={category.expenseCategoryId}>
                            {category.expenseCategoryCode}
                          </option>
                        ))}
                      </select>

                      <input name="budgetItemCode" defaultValue={item.budgetItemCode} required />
                      <input name="budgetItemName" defaultValue={item.budgetItemName} required />
                      <button type="submit">項目更新</button>
                    </form>

                    <form action={deleteBudgetItemAction}>
                      <input type="hidden" name="budgetItemId" value={item.budgetItemId} />
                      <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                      <input type="hidden" name="eventCode" value={selectedEventCode} />
                      <ConfirmSubmitButton
                        label="項目削除"
                        className="dangerButton"
                        confirmMessage="この予算項目を削除します。よろしいですか？"
                      />
                    </form>
                  </div>

                  <form action={upsertBudgetTableAction} className="matrixForm">
                    <input type="hidden" name="budgetItemId" value={item.budgetItemId} />
                    <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                    <input type="hidden" name="eventCode" value={selectedEventCode} />
                    <p className="matrixTitle">予算（円）</p>
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
                                  name={`budget_${month}`}
                                  defaultValue={budgetMap.get(month) ?? 0}
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="matrixTotalRow">
                            <td className="matrixTotalLabel" colSpan={11}>合計</td>
                            <td className="matrixTotalValue">{formatYen(budgetTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <button type="submit" className="tableSave">
                      予算を一括保存
                    </button>
                  </form>

                  <form action={upsertActualTableAction} className="matrixForm">
                    <input type="hidden" name="budgetItemId" value={item.budgetItemId} />
                    <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                    <input type="hidden" name="eventCode" value={selectedEventCode} />
                    <fieldset className="matrixFieldset" disabled={item.actualFinalizedFlg}>
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
                              <td className="matrixTotalLabel" colSpan={11}>合計</td>
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

                  <form action={item.actualFinalizedFlg ? unfinalizeActualAction : finalizeActualAction}>
                    <input type="hidden" name="budgetItemId" value={item.budgetItemId} />
                    <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                    <input type="hidden" name="eventCode" value={selectedEventCode} />
                    <button type="submit" className="toggleFinalize">
                      {item.actualFinalizedFlg ? '確定解除' : '実績確定'}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
