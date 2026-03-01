import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type EventItem = {
  eventId: string;
  eventCode: string;
  eventName: string;
  eventOrder: number;
};

export type ExpenseCategory = {
  expenseCategoryId: string;
  expenseCategoryCode: string;
  expenseCategoryName: string;
};

export type MonthlyBudget = {
  fiscalMonth: number;
  budgetAmount: number;
};

export type MonthlyActual = {
  fiscalMonth: number;
  actualAmount: number;
};

export type BudgetItem = {
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

export type EventSummaryPoint = {
  expenseCategoryCode: string;
  expenseCategoryName: string;
  amount: number;
};

export type EventSummary = {
  fiscalYear: number;
  eventCode: string;
  series: EventSummaryPoint[];
};

export type SearchParams = {
  fiscalYear?: string;
  eventCode?: string;
  compareEventCode?: string;
  expenseCategoryCode?: string;
  budgetItemId?: string;
  message?: string;
  error?: string;
};

export const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);
export const CODE_MAX_LENGTH = 50;
export const NAME_MAX_LENGTH = 100;
export const MIN_FISCAL_YEAR = 2000;
export const MAX_FISCAL_YEAR = 2100;
export const MAX_AMOUNT = 2_000_000_000;

const VALID_RETURN_PATHS = new Set(['/budget', '/actual', '/graph', '/categories', '/copy']);

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
}

export function buildQuery(params: {
  fiscalYear: number;
  eventCode: string;
  compareEventCode?: string;
  expenseCategoryCode?: string;
  budgetItemId?: string;
  message?: string;
  error?: string;
}) {
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

  if (params.compareEventCode) {
    query.set('compareEventCode', params.compareEventCode);
  }

  if (params.expenseCategoryCode) {
    query.set('expenseCategoryCode', params.expenseCategoryCode);
  }

  if (params.budgetItemId) {
    query.set('budgetItemId', params.budgetItemId);
  }

  return query.toString();
}

export function isValidFiscalYear(value: number) {
  return Number.isInteger(value) && value >= MIN_FISCAL_YEAR && value <= MAX_FISCAL_YEAR;
}

function parseMonthlyAmounts(formData: FormData, prefix: 'budget' | 'actual') {
  const months: Array<{ fiscalMonth: number; amount: number }> = [];

  for (const month of MONTHS) {
    const raw = Number(formData.get(`${prefix}_${month}`));
    if (!Number.isInteger(raw) || raw < 0 || raw > MAX_AMOUNT) {
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

export async function getEvents(): Promise<EventItem[]> {
  const res = await fetch(`${getBaseUrl()}/events`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await fetch(`${getBaseUrl()}/expense-categories`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getBudgetItems(fiscalYear: number, eventCode: string): Promise<BudgetItem[]> {
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

export async function getEventSummary(
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

export function formatYen(amount: number) {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

export function resolveContext(searchParams: SearchParams | undefined, events: EventItem[]) {
  const currentYear = new Date().getFullYear();
  const fiscalYearRaw = Number(searchParams?.fiscalYear ?? currentYear);
  const fiscalYear = isValidFiscalYear(fiscalYearRaw) ? fiscalYearRaw : currentYear;
  const eventCode = searchParams?.eventCode ?? (events.length > 0 ? events[0].eventCode : '');
  return { currentYear, fiscalYear, eventCode };
}

function sanitizeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === 'string' ? value : '';
  return VALID_RETURN_PATHS.has(path) ? path : '/budget';
}

function revalidateDashboardPages() {
  revalidatePath('/budget');
  revalidatePath('/actual');
  revalidatePath('/graph');
  revalidatePath('/categories');
  revalidatePath('/copy');
  revalidatePath('/');
}

function redirectTo(
  returnPath: string,
  params: {
    fiscalYear: number;
    eventCode: string;
    compareEventCode?: string;
    expenseCategoryCode?: string;
    budgetItemId?: string;
    message?: string;
    error?: string;
  }
): never {
  redirect(`${returnPath}?${buildQuery(params)}`);
}

function redirectWithError(
  returnPath: string,
  fiscalYear: number,
  eventCode: string,
  error: string,
  fallbackYear?: number,
  options?: {
    compareEventCode?: string;
    expenseCategoryCode?: string;
    budgetItemId?: string;
  }
): never {
  redirectTo(returnPath, {
    fiscalYear: isValidFiscalYear(fiscalYear) ? fiscalYear : fallbackYear ?? new Date().getFullYear(),
    eventCode,
    compareEventCode: options?.compareEventCode,
    expenseCategoryCode: options?.expenseCategoryCode,
    budgetItemId: options?.budgetItemId,
    error
  });
}

function readSelectedBudgetContext(formData: FormData) {
  const expenseCategoryCode = String(formData.get('expenseCategoryCode') ?? '').trim();
  const budgetItemId = String(formData.get('budgetItemId') ?? '').trim();
  return {
    expenseCategoryCode: expenseCategoryCode || undefined,
    budgetItemId: budgetItemId || undefined
  };
}

export async function createExpenseCategoryAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryCode = String(formData.get('expenseCategoryCode') ?? '').trim();
  const expenseCategoryName = String(formData.get('expenseCategoryName') ?? '').trim();

  if (!isValidFiscalYear(fiscalYear)) {
    redirectWithError(returnPath, fiscalYear, eventCode, '年度は2000-2100で入力してください');
  }

  if (
    !expenseCategoryCode ||
    !expenseCategoryName ||
    expenseCategoryCode.length > CODE_MAX_LENGTH ||
    expenseCategoryName.length > NAME_MAX_LENGTH
  ) {
    redirectWithError(returnPath, fiscalYear, eventCode, '費目コード/費目名の入力値が不正です');
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
    redirectWithError(returnPath, fiscalYear, eventCode, message);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, message: '費目を作成しました' });
}

export async function updateExpenseCategoryAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const expenseCategoryCode = String(formData.get('expenseCategoryCode') ?? '').trim();
  const expenseCategoryName = String(formData.get('expenseCategoryName') ?? '').trim();

  if (
    !isValidFiscalYear(fiscalYear) ||
    !expenseCategoryId ||
    !expenseCategoryCode ||
    !expenseCategoryName ||
    expenseCategoryCode.length > CODE_MAX_LENGTH ||
    expenseCategoryName.length > NAME_MAX_LENGTH
  ) {
    redirectWithError(returnPath, fiscalYear, eventCode, '費目更新の入力が不足しています');
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
    redirectWithError(returnPath, fiscalYear, eventCode, message);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, message: '費目を更新しました' });
}

export async function deleteExpenseCategoryAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');

  if (!isValidFiscalYear(fiscalYear) || !expenseCategoryId) {
    redirectWithError(returnPath, fiscalYear, eventCode, '費目IDが不正です');
  }

  const res = await callApi(`/expense-categories/${expenseCategoryId}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirectWithError(returnPath, fiscalYear, eventCode, '費目の削除に失敗しました');
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, message: '費目を削除しました' });
}

export async function createBudgetItemAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const budgetItemName = String(formData.get('budgetItemName') ?? '').trim();

  if (
    !isValidFiscalYear(fiscalYear) ||
    !eventCode ||
    !eventId ||
    !expenseCategoryId ||
    !budgetItemName ||
    budgetItemName.length > NAME_MAX_LENGTH
  ) {
    redirectWithError(returnPath, fiscalYear, eventCode, '必須項目を入力してください');
  }

  const res = await callApi('/budget-items', {
    method: 'POST',
    body: JSON.stringify({
      fiscalYear,
      eventId,
      expenseCategoryId,
      budgetItemName
    })
  });

  if (!res.ok) {
    const errorText = res.status === 409 ? '重複する予算項目です' : '予算項目の作成に失敗しました';
    redirectWithError(returnPath, fiscalYear, eventCode, errorText);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, message: '予算項目を作成しました' });
}

export async function copyEventDataAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const fromFiscalYear = Number(formData.get('fromFiscalYear'));
  const fromEventCode = String(formData.get('fromEventCode') ?? '').trim();
  const toFiscalYear = Number(formData.get('toFiscalYear'));
  const toEventCode = String(formData.get('toEventCode') ?? '').trim();

  if (
    !isValidFiscalYear(fromFiscalYear) ||
    !isValidFiscalYear(toFiscalYear) ||
    !fromEventCode ||
    !toEventCode
  ) {
    redirectWithError(
      returnPath,
      toFiscalYear,
      toEventCode || fromEventCode,
      'コピー元/コピー先の年度・イベントを正しく指定してください',
      new Date().getFullYear()
    );
  }

  if (fromFiscalYear === toFiscalYear || fromEventCode === toEventCode) {
    redirectWithError(
      returnPath,
      toFiscalYear,
      toEventCode,
      'コピー元とコピー先は年度とイベントの両方を変更してください'
    );
  }

  const eventsRes = await callApi('/events');
  const events = eventsRes.ok
    ? ((await eventsRes.json()) as Array<{ eventCode: string; eventOrder: number }>)
    : [];

  const fromEventOrder = events.find((event) => event.eventCode === fromEventCode)?.eventOrder;
  const toEventOrder = events.find((event) => event.eventCode === toEventCode)?.eventOrder;

  if (fromEventOrder === undefined || toEventOrder === undefined) {
    redirectWithError(returnPath, toFiscalYear, toEventCode, 'イベント情報の取得に失敗しました');
  }

  const isFutureDestination =
    toFiscalYear > fromFiscalYear ||
    (toFiscalYear === fromFiscalYear && toEventOrder > fromEventOrder);

  if (!isFutureDestination) {
    redirectWithError(
      returnPath,
      toFiscalYear,
      toEventCode,
      'コピー先はコピー元より未来の年度/イベントを指定してください'
    );
  }

  const res = await callApi('/budget-items/copy', {
    method: 'POST',
    body: JSON.stringify({
      fromFiscalYear,
      fromEventCode,
      toFiscalYear,
      toEventCode
    })
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { message?: string } | null;
    const errorText =
      errorBody?.message ??
      (res.status === 404
        ? 'コピー元またはコピー先イベントが見つかりません'
        : '予算/実績のコピーに失敗しました');
    redirectWithError(returnPath, toFiscalYear, toEventCode, errorText);
  }

  const copyResult = (await res.json().catch(() => null)) as
    | {
        copiedItemCount?: number;
        copiedBudgetRowCount?: number;
        copiedActualRowCount?: number;
      }
    | null;

  const copiedItemCount = copyResult?.copiedItemCount ?? 0;
  const copiedBudgetRowCount = copyResult?.copiedBudgetRowCount ?? 0;
  const copiedActualRowCount = copyResult?.copiedActualRowCount ?? 0;

  revalidateDashboardPages();
  redirectTo(returnPath, {
    fiscalYear: toFiscalYear,
    eventCode: toEventCode,
    message: `予算/実績をコピーしました（項目${copiedItemCount}件・予算${copiedBudgetRowCount}件・実績${copiedActualRowCount}件）`
  });
}

export async function updateBudgetItemAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');
  const expenseCategoryId = String(formData.get('expenseCategoryId') ?? '');
  const budgetItemName = String(formData.get('budgetItemName') ?? '').trim();

  if (
    !isValidFiscalYear(fiscalYear) ||
    !budgetItemId ||
    !expenseCategoryId ||
    !budgetItemName ||
    budgetItemName.length > NAME_MAX_LENGTH
  ) {
    redirectWithError(returnPath, fiscalYear, eventCode, '予算項目更新の入力が不足しています', undefined, selected);
  }

  const res = await callApi(`/budget-items/${budgetItemId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expenseCategoryId,
      budgetItemName
    })
  });

  if (!res.ok) {
    const message = res.status === 409 ? '重複する予算項目です' : '予算項目の更新に失敗しました';
    redirectWithError(returnPath, fiscalYear, eventCode, message, undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, ...selected, message: '予算項目を更新しました' });
}

export async function deleteBudgetItemAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  if (!isValidFiscalYear(fiscalYear) || !budgetItemId) {
    redirectWithError(returnPath, fiscalYear, eventCode, '予算項目IDが不正です', undefined, selected);
  }

  const res = await callApi(`/budget-items/${budgetItemId}`, {
    method: 'DELETE',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirectWithError(returnPath, fiscalYear, eventCode, '予算項目の削除に失敗しました', undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, expenseCategoryCode: selected.expenseCategoryCode, message: '予算項目を削除しました' });
}

export async function upsertBudgetTableAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const rows = parseMonthlyAmounts(formData, 'budget');
  if (!isValidFiscalYear(fiscalYear) || !budgetItemId || !rows) {
    redirectWithError(
      returnPath,
      fiscalYear,
      eventCode,
      '予算は0以上20億以下の整数で入力してください',
      undefined,
      selected
    );
  }

  const res = await callApi(`/budget-items/${budgetItemId}/budgets`, {
    method: 'PUT',
    body: JSON.stringify({
      months: rows.map((row) => ({ fiscalMonth: row.fiscalMonth, budgetAmount: row.amount }))
    })
  });

  if (!res.ok) {
    redirectWithError(returnPath, fiscalYear, eventCode, '予算一括保存に失敗しました', undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, ...selected, message: '予算を一括更新しました' });
}

export async function upsertActualTableAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  const rows = parseMonthlyAmounts(formData, 'actual');
  if (!isValidFiscalYear(fiscalYear) || !budgetItemId || !rows) {
    redirectWithError(
      returnPath,
      fiscalYear,
      eventCode,
      '実績は0以上20億以下の整数で入力してください',
      undefined,
      selected
    );
  }

  const res = await callApi(`/budget-items/${budgetItemId}/actuals`, {
    method: 'PUT',
    body: JSON.stringify({
      months: rows.map((row) => ({ fiscalMonth: row.fiscalMonth, actualAmount: row.amount }))
    })
  });

  if (!res.ok) {
    const errorText = res.status === 409 ? 'この項目は実績確定済みです' : '実績一括保存に失敗しました';
    redirectWithError(returnPath, fiscalYear, eventCode, errorText, undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, ...selected, message: '実績を一括更新しました' });
}

export async function finalizeActualAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  if (!isValidFiscalYear(fiscalYear) || !budgetItemId) {
    redirectWithError(returnPath, fiscalYear, eventCode, '確定対象が不正です', undefined, selected);
  }

  const res = await callApi(`/budget-items/${budgetItemId}/finalize-actual`, {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirectWithError(returnPath, fiscalYear, eventCode, '確定に失敗しました', undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, ...selected, message: '実績を確定しました' });
}

export async function unfinalizeActualAction(formData: FormData) {
  'use server';

  const returnPath = sanitizeReturnPath(formData.get('returnPath'));
  const selected = readSelectedBudgetContext(formData);
  const budgetItemId = String(formData.get('budgetItemId') ?? '');
  const fiscalYear = Number(formData.get('fiscalYear'));
  const eventCode = String(formData.get('eventCode') ?? '');

  if (!isValidFiscalYear(fiscalYear) || !budgetItemId) {
    redirectWithError(returnPath, fiscalYear, eventCode, '確定解除対象が不正です', undefined, selected);
  }

  const res = await callApi(`/budget-items/${budgetItemId}/unfinalize-actual`, {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (!res.ok) {
    redirectWithError(returnPath, fiscalYear, eventCode, '確定解除に失敗しました', undefined, selected);
  }

  revalidateDashboardPages();
  redirectTo(returnPath, { fiscalYear, eventCode, ...selected, message: '実績確定を解除しました' });
}
