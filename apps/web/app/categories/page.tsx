import { ConfirmSubmitButton } from '../components/ConfirmSubmitButton';
import { DashboardShell } from '../components/DashboardShell';
import {
  createExpenseCategoryAction,
  deleteExpenseCategoryAction,
  getEvents,
  getExpenseCategories,
  resolveContext,
  type SearchParams,
  updateExpenseCategoryAction
} from '../lib/dashboard';

type CategoriesPageProps = {
  searchParams?: SearchParams;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const events = await getEvents();
  const categories = await getExpenseCategories();
  const { fiscalYear, eventCode } = resolveContext(searchParams, events);

  return (
    <DashboardShell
      currentPath="/categories"
      fiscalYear={fiscalYear}
      eventCode={eventCode}
      message={searchParams?.message}
      error={searchParams?.error}
    >
      <section className="sectionBlock">
        <h2 className="sectionTitle">費目マスタメンテ</h2>
        <form className="createForm categoryCreateForm" action={createExpenseCategoryAction}>
          <input type="hidden" name="returnPath" value="/categories" />
          <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
          <input type="hidden" name="eventCode" value={eventCode} />

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
                <input type="hidden" name="returnPath" value="/categories" />
                <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                <input type="hidden" name="eventCode" value={eventCode} />
                <input type="hidden" name="expenseCategoryId" value={category.expenseCategoryId} />
                <input name="expenseCategoryCode" defaultValue={category.expenseCategoryCode} required />
                <input name="expenseCategoryName" defaultValue={category.expenseCategoryName} required />
                <button type="submit">更新</button>
              </form>

              <form action={deleteExpenseCategoryAction}>
                <input type="hidden" name="returnPath" value="/categories" />
                <input type="hidden" name="fiscalYear" value={String(fiscalYear)} />
                <input type="hidden" name="eventCode" value={eventCode} />
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
      </section>
    </DashboardShell>
  );
}
