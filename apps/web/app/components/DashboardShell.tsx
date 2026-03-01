import Link from 'next/link';
import type { ReactNode } from 'react';
import { buildQuery } from '../lib/dashboard';

type DashboardPath = '/budget' | '/actual' | '/graph' | '/categories' | '/copy';

type DashboardShellProps = {
  currentPath: DashboardPath;
  fiscalYear: number;
  eventCode: string;
  message?: string;
  error?: string;
  children: ReactNode;
};

const MENU_ITEMS: Array<{ path: DashboardPath; label: string }> = [
  { path: '/budget', label: '予算登録' },
  { path: '/actual', label: '実績登録' },
  { path: '/graph', label: 'グラフ' },
  { path: '/categories', label: '費目登録' },
  { path: '/copy', label: '条件指定・全コピー' }
];

export function DashboardShell({
  currentPath,
  fiscalYear,
  eventCode,
  message,
  error,
  children
}: DashboardShellProps) {
  return (
    <main className="page">
      <section className="card">
        <div className="dashboardLayout">
          <aside className="sidebarMenu" aria-label="ページメニュー">
            <p className="sidebarTitle">メニュー</p>
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={`${item.path}?${buildQuery({ fiscalYear, eventCode })}`}
                className={item.path === currentPath ? 'activeMenuLink' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </aside>

          <div className="mainContent">
            <p className="badge">monorepo bootstrap succeeded</p>
            <h1 className="mainTitle">Expense Budget Manager</h1>
            {message && <p className="notice success">{message}</p>}
            {error && <p className="notice error">{error}</p>}
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
