import Link from 'next/link';
import type { IndicatorStatus } from '@/lib/api/types';

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  status: IndicatorStatus | undefined;
}

export function pageHref(page: number, status: IndicatorStatus | undefined): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function Pagination({ total, limit, offset, status }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="row pagination">
      {page > 1 ? (
        <Link href={pageHref(page - 1, status)} className="button">
          Previous
        </Link>
      ) : (
        <span className="button" aria-disabled="true">
          Previous
        </span>
      )}
      <span className="muted small">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={pageHref(page + 1, status)} className="button">
          Next
        </Link>
      ) : (
        <span className="button" aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
