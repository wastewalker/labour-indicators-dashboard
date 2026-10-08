import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Labour Indicators', template: '%s · Labour Indicators' },
  description: 'Labour-market indicator series with year-over-year variation.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                LI
              </span>
              Labour Indicators
            </Link>
            <Link href="/indicators/new" className="button button-primary">
              New indicator
            </Link>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
