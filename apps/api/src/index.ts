import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { prisma } from 'db';

const app = new Hono();
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseFiscalYear = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  return year;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002';

app.get('/health', async (c) => {
  await prisma.$queryRaw`SELECT 1`;
  return c.json({ ok: true });
});

app.get('/events', async (c) => {
  try {
    const events = await prisma.mstEvent.findMany({
      where: { delFlg: false },
      orderBy: { eventOrder: 'asc' }
    });
    return c.json(events);
  } catch (error) {
    console.error(error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.get('/expense-categories', async (c) => {
  const categories = await prisma.mstExpenseCategory.findMany({
    where: { delFlg: false },
    orderBy: { expenseCategoryCode: 'asc' }
  });
  return c.json(categories);
});

app.get('/budget-items', async (c) => {
  const fiscalYear = parseFiscalYear(c.req.query('fiscalYear'));
  if (fiscalYear === null) {
    return c.json({ message: 'fiscalYear must be an integer' }, 400);
  }

  const eventCode = c.req.query('eventCode');
  const expenseCategoryCode = c.req.query('expenseCategoryCode');

  try {
    const items = await prisma.mstBudgetItem.findMany({
      where: {
        delFlg: false,
        fiscalYear: fiscalYear ?? undefined,
        event: eventCode
          ? {
              is: {
                eventCode,
                delFlg: false
              }
            }
          : undefined,
        expenseCategory: expenseCategoryCode
          ? {
              is: {
                expenseCategoryCode,
                delFlg: false
              }
            }
          : undefined
      },
      orderBy: [{ fiscalYear: 'asc' }, { budgetItemCode: 'asc' }],
      include: {
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
            eventOrder: true
          }
        },
        expenseCategory: {
          select: {
            expenseCategoryId: true,
            expenseCategoryCode: true,
            expenseCategoryName: true
          }
        },
        budgetMonthlies: {
          where: { delFlg: false },
          select: {
            fiscalMonth: true,
            budgetAmount: true
          }
        },
        actualMonthlies: {
          where: { delFlg: false },
          select: {
            fiscalMonth: true,
            actualAmount: true
          }
        }
      }
    });

    return c.json(items);
  } catch (error) {
    console.error('GET /budget-items failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.post('/budget-items', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (
    !isNonEmptyString(body?.budgetItemCode) ||
    !isNonEmptyString(body?.budgetItemName) ||
    !isNonEmptyString(body?.eventId) ||
    !isNonEmptyString(body?.expenseCategoryId) ||
    !Number.isInteger(body?.fiscalYear)
  ) {
    return c.json(
      {
        message:
          'fiscalYear, eventId, expenseCategoryId, budgetItemCode and budgetItemName are required'
      },
      400
    );
  }

  if (!UUID_REGEX.test(body.eventId) || !UUID_REGEX.test(body.expenseCategoryId)) {
    return c.json({ message: 'eventId and expenseCategoryId must be valid uuid' }, 400);
  }

  try {
    const [event, expenseCategory] = await Promise.all([
      prisma.mstEvent.findFirst({
        where: { eventId: body.eventId, delFlg: false }
      }),
      prisma.mstExpenseCategory.findFirst({
        where: { expenseCategoryId: body.expenseCategoryId, delFlg: false }
      })
    ]);

    if (!event) {
      return c.json({ message: 'event not found' }, 404);
    }

    if (!expenseCategory) {
      return c.json({ message: 'expense category not found' }, 404);
    }

    const created = await prisma.mstBudgetItem.create({
      data: {
        fiscalYear: body.fiscalYear,
        eventId: body.eventId,
        expenseCategoryId: body.expenseCategoryId,
        budgetItemCode: body.budgetItemCode,
        budgetItemName: body.budgetItemName
      }
    });

    return c.json(created, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ message: 'budget item already exists' }, 409);
    }
    console.error('POST /budget-items failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.put('/budget-items/:budgetItemId', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const hasAnyField =
    body !== null &&
    (body.fiscalYear !== undefined ||
      body.eventId !== undefined ||
      body.expenseCategoryId !== undefined ||
      body.budgetItemCode !== undefined ||
      body.budgetItemName !== undefined ||
      body.actualFinalizedFlg !== undefined);

  if (!hasAnyField) {
    return c.json(
      {
        message:
          'at least one of fiscalYear, eventId, expenseCategoryId, budgetItemCode, budgetItemName, actualFinalizedFlg is required'
      },
      400
    );
  }

  if (
    body.eventId !== undefined &&
    (!isNonEmptyString(body.eventId) || !UUID_REGEX.test(body.eventId))
  ) {
    return c.json({ message: 'eventId must be valid uuid' }, 400);
  }

  if (
    body.expenseCategoryId !== undefined &&
    (!isNonEmptyString(body.expenseCategoryId) || !UUID_REGEX.test(body.expenseCategoryId))
  ) {
    return c.json({ message: 'expenseCategoryId must be valid uuid' }, 400);
  }

  if (body.fiscalYear !== undefined && !Number.isInteger(body.fiscalYear)) {
    return c.json({ message: 'fiscalYear must be an integer' }, 400);
  }

  if (body.budgetItemCode !== undefined && !isNonEmptyString(body.budgetItemCode)) {
    return c.json({ message: 'budgetItemCode must be non-empty string' }, 400);
  }

  if (body.budgetItemName !== undefined && !isNonEmptyString(body.budgetItemName)) {
    return c.json({ message: 'budgetItemName must be non-empty string' }, 400);
  }

  if (body.actualFinalizedFlg !== undefined && typeof body.actualFinalizedFlg !== 'boolean') {
    return c.json({ message: 'actualFinalizedFlg must be boolean' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    if (body.eventId !== undefined) {
      const event = await prisma.mstEvent.findFirst({
        where: { eventId: body.eventId, delFlg: false }
      });
      if (!event) {
        return c.json({ message: 'event not found' }, 404);
      }
    }

    if (body.expenseCategoryId !== undefined) {
      const category = await prisma.mstExpenseCategory.findFirst({
        where: { expenseCategoryId: body.expenseCategoryId, delFlg: false }
      });
      if (!category) {
        return c.json({ message: 'expense category not found' }, 404);
      }
    }

    const updated = await prisma.mstBudgetItem.update({
      where: { budgetItemId },
      data: {
        fiscalYear: body.fiscalYear ?? undefined,
        eventId: body.eventId ?? undefined,
        expenseCategoryId: body.expenseCategoryId ?? undefined,
        budgetItemCode: body.budgetItemCode ?? undefined,
        budgetItemName: body.budgetItemName ?? undefined,
        actualFinalizedFlg: body.actualFinalizedFlg ?? undefined,
        actualFinalizedDate:
          body.actualFinalizedFlg === undefined
            ? undefined
            : body.actualFinalizedFlg
              ? new Date()
              : null
      }
    });

    return c.json(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ message: 'budget item already exists' }, 409);
    }
    console.error('PUT /budget-items/:budgetItemId failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.delete('/budget-items/:budgetItemId', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    const deleted = await prisma.mstBudgetItem.update({
      where: { budgetItemId },
      data: { delFlg: true }
    });

    return c.json(deleted);
  } catch (error) {
    console.error('DELETE /budget-items/:budgetItemId failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.get('/budget-items/:budgetItemId/budgets', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    const budgets = await prisma.trBudgetMonthly.findMany({
      where: {
        budgetItemId,
        delFlg: false
      },
      orderBy: { fiscalMonth: 'asc' }
    });

    return c.json(budgets);
  } catch (error) {
    console.error('GET /budget-items/:budgetItemId/budgets failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.put('/budget-items/:budgetItemId/budgets', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.months)) {
    return c.json({ message: 'months array is required' }, 400);
  }

  const seenMonths = new Set<number>();
  for (const month of body.months as Array<{ fiscalMonth?: unknown; budgetAmount?: unknown }>) {
    if (!Number.isInteger(month?.fiscalMonth) || !Number.isInteger(month?.budgetAmount)) {
      return c.json({ message: 'fiscalMonth and budgetAmount must be integers' }, 400);
    }

    if ((month.fiscalMonth as number) < 1 || (month.fiscalMonth as number) > 12) {
      return c.json({ message: 'fiscalMonth must be between 1 and 12' }, 400);
    }

    if ((month.budgetAmount as number) < 0) {
      return c.json({ message: 'budgetAmount must be greater than or equal to 0' }, 400);
    }

    if (seenMonths.has(month.fiscalMonth as number)) {
      return c.json({ message: 'fiscalMonth must be unique in months array' }, 400);
    }
    seenMonths.add(month.fiscalMonth as number);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    await prisma.$transaction(
      body.months.map((month: { fiscalMonth: number; budgetAmount: number }) =>
        prisma.trBudgetMonthly.upsert({
          where: {
            budgetItemId_fiscalMonth: {
              budgetItemId,
              fiscalMonth: month.fiscalMonth
            }
          },
          update: {
            budgetAmount: month.budgetAmount,
            delFlg: false
          },
          create: {
            budgetItemId,
            fiscalMonth: month.fiscalMonth,
            budgetAmount: month.budgetAmount
          }
        })
      )
    );

    const budgets = await prisma.trBudgetMonthly.findMany({
      where: {
        budgetItemId,
        delFlg: false
      },
      orderBy: { fiscalMonth: 'asc' }
    });

    return c.json(budgets);
  } catch (error) {
    console.error('PUT /budget-items/:budgetItemId/budgets failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});


app.get('/budget-items/:budgetItemId/actuals', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    const actuals = await prisma.trActualMonthly.findMany({
      where: {
        budgetItemId,
        delFlg: false
      },
      orderBy: { fiscalMonth: 'asc' }
    });

    return c.json(actuals);
  } catch (error) {
    console.error('GET /budget-items/:budgetItemId/actuals failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.put('/budget-items/:budgetItemId/actuals', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.months)) {
    return c.json({ message: 'months array is required' }, 400);
  }

  const seenMonths = new Set<number>();
  for (const month of body.months as Array<{ fiscalMonth?: unknown; actualAmount?: unknown }>) {
    if (!Number.isInteger(month?.fiscalMonth) || !Number.isInteger(month?.actualAmount)) {
      return c.json({ message: 'fiscalMonth and actualAmount must be integers' }, 400);
    }

    if ((month.fiscalMonth as number) < 1 || (month.fiscalMonth as number) > 12) {
      return c.json({ message: 'fiscalMonth must be between 1 and 12' }, 400);
    }

    if ((month.actualAmount as number) < 0) {
      return c.json({ message: 'actualAmount must be greater than or equal to 0' }, 400);
    }

    if (seenMonths.has(month.fiscalMonth as number)) {
      return c.json({ message: 'fiscalMonth must be unique in months array' }, 400);
    }
    seenMonths.add(month.fiscalMonth as number);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    if (target.actualFinalizedFlg) {
      return c.json({ message: 'actuals are finalized for this budget item' }, 409);
    }

    await prisma.$transaction(
      body.months.map((month: { fiscalMonth: number; actualAmount: number }) =>
        prisma.trActualMonthly.upsert({
          where: {
            budgetItemId_fiscalMonth: {
              budgetItemId,
              fiscalMonth: month.fiscalMonth
            }
          },
          update: {
            actualAmount: month.actualAmount,
            delFlg: false
          },
          create: {
            budgetItemId,
            fiscalMonth: month.fiscalMonth,
            actualAmount: month.actualAmount
          }
        })
      )
    );

    const actuals = await prisma.trActualMonthly.findMany({
      where: {
        budgetItemId,
        delFlg: false
      },
      orderBy: { fiscalMonth: 'asc' }
    });

    return c.json(actuals);
  } catch (error) {
    console.error('PUT /budget-items/:budgetItemId/actuals failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});


app.post('/budget-items/:budgetItemId/finalize-actual', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    const finalized = await prisma.mstBudgetItem.update({
      where: { budgetItemId },
      data: {
        actualFinalizedFlg: true,
        actualFinalizedDate: new Date()
      }
    });

    return c.json(finalized);
  } catch (error) {
    console.error('POST /budget-items/:budgetItemId/finalize-actual failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

app.post('/budget-items/:budgetItemId/unfinalize-actual', async (c) => {
  const budgetItemId = c.req.param('budgetItemId');
  if (!UUID_REGEX.test(budgetItemId)) {
    return c.json({ message: 'budgetItemId must be valid uuid' }, 400);
  }

  try {
    const target = await prisma.mstBudgetItem.findFirst({
      where: { budgetItemId, delFlg: false }
    });

    if (!target) {
      return c.json({ message: 'budget item not found' }, 404);
    }

    const unfinalized = await prisma.mstBudgetItem.update({
      where: { budgetItemId },
      data: {
        actualFinalizedFlg: false,
        actualFinalizedDate: null
      }
    });

    return c.json(unfinalized);
  } catch (error) {
    console.error('POST /budget-items/:budgetItemId/unfinalize-actual failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});


app.get('/reports/event-summary', async (c) => {
  const fiscalYearRaw = c.req.query('fiscalYear');
  const eventCode = c.req.query('eventCode');

  const fiscalYear = fiscalYearRaw ? Number(fiscalYearRaw) : NaN;
  if (!Number.isInteger(fiscalYear)) {
    return c.json({ message: 'fiscalYear must be an integer' }, 400);
  }

  if (!isNonEmptyString(eventCode)) {
    return c.json({ message: 'eventCode is required' }, 400);
  }

  try {
    const event = await prisma.mstEvent.findFirst({
      where: {
        eventCode,
        delFlg: false
      }
    });

    if (!event) {
      return c.json({ message: 'event not found' }, 404);
    }

    const items = await prisma.mstBudgetItem.findMany({
      where: {
        fiscalYear,
        eventId: event.eventId,
        delFlg: false,
        expenseCategory: {
          is: {
            delFlg: false
          }
        }
      },
      include: {
        expenseCategory: {
          select: {
            expenseCategoryCode: true,
            expenseCategoryName: true
          }
        },
        budgetMonthlies: {
          where: { delFlg: false },
          select: {
            fiscalMonth: true,
            budgetAmount: true
          }
        },
        actualMonthlies: {
          where: { delFlg: false },
          select: {
            fiscalMonth: true,
            actualAmount: true
          }
        }
      }
    });

    const summaryByCategory = new Map<
      string,
      { expenseCategoryCode: string; expenseCategoryName: string; amount: number }
    >();

    for (const item of items) {
      const code = item.expenseCategory.expenseCategoryCode;
      const name = item.expenseCategory.expenseCategoryName;

      if (!summaryByCategory.has(code)) {
        summaryByCategory.set(code, {
          expenseCategoryCode: code,
          expenseCategoryName: name,
          amount: 0
        });
      }

      const budgetMap = new Map(item.budgetMonthlies.map((m) => [m.fiscalMonth, m.budgetAmount]));
      const actualMap = new Map(item.actualMonthlies.map((m) => [m.fiscalMonth, m.actualAmount]));

      let itemAmount = 0;
      for (let month = 1; month <= 12; month += 1) {
        itemAmount += actualMap.get(month) ?? budgetMap.get(month) ?? 0;
      }

      const summary = summaryByCategory.get(code);
      if (summary) {
        summary.amount += itemAmount;
      }
    }

    const series = Array.from(summaryByCategory.values()).sort((a, b) =>
      a.expenseCategoryCode.localeCompare(b.expenseCategoryCode)
    );

    return c.json({
      fiscalYear,
      eventCode,
      series
    });
  } catch (error) {
    console.error('GET /reports/event-summary failed:', error);
    return c.json({ message: 'internal server error' }, 500);
  }
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log('API server running on http://localhost:' + port);
