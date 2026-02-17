import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prisma } from 'db';
import { app } from './app';

type CopyResponse = {
  copiedItemCount: number;
  copiedBudgetRowCount: number;
  copiedActualRowCount: number;
};

async function postCopy(payload: {
  fromFiscalYear: number;
  fromEventCode: string;
  toFiscalYear: number;
  toEventCode: string;
}) {
  return app.request('/budget-items/copy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('copy API rejects same fiscal year even if event differs', async () => {
  const res = await postCopy({
    fromFiscalYear: 2026,
    fromEventCode: '1Q',
    toFiscalYear: 2026,
    toEventCode: '2Q'
  });

  assert.equal(res.status, 400);
  const body = (await res.json()) as { message?: string };
  assert.match(body.message ?? '', /different fiscalYear and eventCode/);
});

test('copy API rejects non-future destination', async () => {
  const res = await postCopy({
    fromFiscalYear: 2027,
    fromEventCode: '2Q',
    toFiscalYear: 2026,
    toEventCode: '3Q'
  });

  assert.equal(res.status, 400);
  const body = (await res.json()) as { message?: string };
  assert.match(body.message ?? '', /destination must be future/);
});

test('copy API copies budget/actual rows to future fiscal year and different event', async () => {
  const [event1Q, event2Q, category] = await Promise.all([
    prisma.mstEvent.findFirst({ where: { eventCode: '1Q', delFlg: false } }),
    prisma.mstEvent.findFirst({ where: { eventCode: '2Q', delFlg: false } }),
    prisma.mstExpenseCategory.findFirst({ where: { delFlg: false } })
  ]);

  assert.ok(event1Q, 'event 1Q must exist');
  assert.ok(event2Q, 'event 2Q must exist');
  assert.ok(category, 'expense category must exist');

  const fromFiscalYear = 2098;
  const toFiscalYear = 2099;
  const codeSuffix = Date.now().toString().slice(-6);
  const sourceCode = `T${codeSuffix}`;

  const sourceItem = await prisma.mstBudgetItem.create({
    data: {
      fiscalYear: fromFiscalYear,
      eventId: event1Q.eventId,
      expenseCategoryId: category.expenseCategoryId,
      budgetItemCode: sourceCode,
      budgetItemName: 'copy-test-source'
    }
  });

  await prisma.trBudgetMonthly.createMany({
    data: [
      {
        budgetItemId: sourceItem.budgetItemId,
        fiscalMonth: 1,
        budgetAmount: 1200
      },
      {
        budgetItemId: sourceItem.budgetItemId,
        fiscalMonth: 2,
        budgetAmount: 3400
      }
    ]
  });

  await prisma.trActualMonthly.createMany({
    data: [
      {
        budgetItemId: sourceItem.budgetItemId,
        fiscalMonth: 1,
        actualAmount: 1000
      },
      {
        budgetItemId: sourceItem.budgetItemId,
        fiscalMonth: 2,
        actualAmount: 3000
      }
    ]
  });

  const res = await postCopy({
    fromFiscalYear,
    fromEventCode: '1Q',
    toFiscalYear,
    toEventCode: '2Q'
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as CopyResponse;
  assert.ok(body.copiedItemCount >= 1);

  const copiedItem = await prisma.mstBudgetItem.findFirst({
    where: {
      fiscalYear: toFiscalYear,
      eventId: event2Q.eventId,
      expenseCategoryId: category.expenseCategoryId,
      budgetItemCode: sourceCode,
      delFlg: false
    }
  });

  assert.ok(copiedItem, 'copied item must exist');

  const [copiedBudgets, copiedActuals] = await Promise.all([
    prisma.trBudgetMonthly.findMany({
      where: { budgetItemId: copiedItem.budgetItemId, delFlg: false },
      orderBy: { fiscalMonth: 'asc' }
    }),
    prisma.trActualMonthly.findMany({
      where: { budgetItemId: copiedItem.budgetItemId, delFlg: false },
      orderBy: { fiscalMonth: 'asc' }
    })
  ]);

  assert.equal(copiedBudgets.length, 2);
  assert.equal(copiedActuals.length, 2);
  assert.equal(copiedBudgets[0].budgetAmount, 1200);
  assert.equal(copiedBudgets[1].budgetAmount, 3400);
  assert.equal(copiedActuals[0].actualAmount, 1000);
  assert.equal(copiedActuals[1].actualAmount, 3000);
});
