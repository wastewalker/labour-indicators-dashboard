import Link from 'next/link';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusFilter } from '@/components/StatusFilter';
import { api } from '@/lib/api/config';
import { STATUSES } from '@/lib/api/types';
import type { IndicatorStatus } from '@/lib/api/types';
import { FREQUENCY_META, UNIT_META } from '@/lib/domain';
import { formatDate } from '@/lib/format';

const PAGE_SIZE = 10;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseStatus(raw: unknown): IndicatorStatus | undefined {
  return typeof raw === 'string' && (STATUSES as readonly string[]).includes(raw)
    ? (raw as IndicatorStatus)
    : undefined;
}

function parsePage(raw: unknown): number {
  const page = typeof raw === 'string' ? Number.parseInt(raw, 10) : 1;
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function IndicatorsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = parsePage(params.page);
  const offset = (page - 1) * PAGE_SIZE;
  const list = await api.list({ ...(status ? { status } : {}), limit: PAGE_SIZE, offset });

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Indicators</h1>
          <p className="muted">
            {list.total} series
            {status ? ` · ${status}` : ''}
          </p>
        </div>
        <StatusFilter current={status} />
      </div>

      <section className="card" aria-label="Indicator list">
        {list.items.length === 0 ? (
          <div className="empty">
            <p>No indicators {status ? `with status “${status}”` : 'yet'}.</p>
            <Link href="/indicators/new" className="button button-primary">
              Create the first one
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Indicator</th>
                  <th scope="col">Code</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((indicator) => (
                  <tr key={indicator.id}>
                    <td>
                      <Link href={`/indicators/${indicator.id}`} className="row-link">
                        {indicator.name}
                      </Link>
                    </td>
                    <td className="mono">{indicator.code}</td>
                    <td>{UNIT_META[indicator.unit].label}</td>
                    <td>{FREQUENCY_META[indicator.frequency].label}</td>
                    <td>
                      <StatusBadge status={indicator.status} />
                    </td>
                    <td className="num muted">{formatDate(indicator.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={list.total} limit={list.limit} offset={list.offset} status={status} />
      </section>
    </div>
  );
}
