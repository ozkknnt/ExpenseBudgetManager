import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Expense Budget Manager',
  description: 'Monorepo bootstrap'
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
