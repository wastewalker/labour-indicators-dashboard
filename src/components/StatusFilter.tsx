import Link from 'next/link';
import { STATUSES } from '@/lib/api/types';
import type { IndicatorStatus } from '@/lib/api/types';
import { STATUS_LABEL } from '@/lib/domain';

const OPTIONS: { value: IndicatorStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  ...STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];

/** Filters are links, not client state: the URL is shareable and works without JS. */
export function StatusFilter({ current }: { current: IndicatorStatus | undefined }) {
  return (
    <nav aria-label="Filter by status" className="tabs">
      {OPTIONS.map((option) => {
        const href = option.value ? `/?status=${option.value}` : '/';
        const active = option.value === current;
        return (
          <Link
            key={option.label}
            href={href}
            className={active ? 'tab tab-active' : 'tab'}
            aria-current={active ? 'page' : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
