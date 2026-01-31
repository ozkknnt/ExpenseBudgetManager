import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { prisma } from 'db';

const app = new Hono();

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

app.post('/expense-categories', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.expenseCategoryCode || !body?.expenseCategoryName) {
    return c.json({ message: 'expenseCategoryCode and expenseCategoryName are required' }, 400);
  }

  const existing = await prisma.mstExpenseCategory.findFirst({
    where: { expenseCategoryCode: body.expenseCategoryCode }
  });

  if (existing) {
    return c.json({ message: 'expense_category_code already exists' }, 409);
  }

  const created = await prisma.mstExpenseCategory.create({
    data: {
      expenseCategoryCode: body.expenseCategoryCode,
      expenseCategoryName: body.expenseCategoryName
    }
  });

  return c.json(created, 201);
});

app.put('/expense-categories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body?.expenseCategoryCode && !body?.expenseCategoryName) {
    return c.json({ message: 'expenseCategoryCode or expenseCategoryName is required' }, 400);
  }

  const target = await prisma.mstExpenseCategory.findFirst({
    where: { expenseCategoryId: id, delFlg: false }
  });

  if (!target) {
    return c.json({ message: 'expense category not found' }, 404);
  }

  if (body?.expenseCategoryCode) {
    const duplicate = await prisma.mstExpenseCategory.findFirst({
      where: {
        expenseCategoryCode: body.expenseCategoryCode,
        expenseCategoryId: { not: id }
      }
    });

    if (duplicate) {
      return c.json({ message: 'expense_category_code already exists' }, 409);
    }
  }

  const updated = await prisma.mstExpenseCategory.update({
    where: { expenseCategoryId: id },
    data: {
      expenseCategoryCode: body.expenseCategoryCode ?? undefined,
      expenseCategoryName: body.expenseCategoryName ?? undefined
    }
  });

  return c.json(updated);
});

app.delete('/expense-categories/:id', async (c) => {
  const id = c.req.param('id');

  const target = await prisma.mstExpenseCategory.findFirst({
    where: { expenseCategoryId: id, delFlg: false }
  });

  if (!target) {
    return c.json({ message: 'expense category not found' }, 404);
  }

  const deleted = await prisma.mstExpenseCategory.update({
    where: { expenseCategoryId: id },
    data: { delFlg: true }
  });

  return c.json(deleted);
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port });

console.log(`API server running on http://localhost:${port}`);
