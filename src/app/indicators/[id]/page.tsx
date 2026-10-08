import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ObservationForm } from '@/components/ObservationForm';
import { SeriesChart } from '@/components/SeriesChart';
import { SeriesTable } from '@/components/SeriesTable';
import { StatusActions } from '@/components/StatusActions';
import { StatusBadge } from '@/components/StatusBadge';
import { VariationCell } from '@/components/VariationCell';
import { api } from '@/lib/api/config';
import { ApiError } from '@/lib/api/errors';
import type { Series } from '@/lib/api/types';
import { FREQUENCY_META, UNIT_META } from '@/lib/domain';
import { describeVariationKind, formatDate, formatValue } from '@/lib/format';
import { addObservationAction, changeStatusAction } from '../actions';

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSeries(id: string): Promise<Series> {
  // The API answers 400 to a malformed id; to a reader that is still "not found".
  if (!UUID_RE.test(id)) notFound();
  try {
    return await api.getSeries(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  try {
    const { indicator } = await loadSeries(id);
    return { title: indicator.name };
  } catch {
    return { title: 'Indicator' };
  }
}

export default async function IndicatorPage({ params }: { params: Params }) {
  const { id } = await params;
  const { indicator, points, variationKind } = await loadSeries(id);
  const latest = points[points.length - 1];

  return (
    <div className="stack">
      <div>
        <Link href="/" className="back">
          ← All indicators
        </Link>
        <div className="row">
          <h1>{indicator.name}</h1>
          <StatusBadge status={indicator.status} />
        </div>
        <ul className="meta">
          <li>
            Code <strong className="mono">{indicator.code}</strong>
          </li>
          <li>
            Unit <strong>{UNIT_META[indicator.unit].label}</strong>
          </li>
          <li>
            Frequency <strong>{FREQUENCY_META[indicator.frequency].label}</strong>
          </li>
          <li>
            Updated <strong>{formatDate(indicator.updatedAt)}</strong>
          </li>
        </ul>
      </div>

      <section className="card" aria-labelledby="series-heading">
        <div className="card-head">
          <h2 id="series-heading">Series</h2>
          <p className="muted small">{describeVariationKind(variationKind)}</p>
        </div>
        {latest ? (
          <div className="row" style={{ gap: 28, marginBottom: 12 }}>
            <div className="stat">
              <span className="muted small">Latest · {latest.period}</span>
              <span className="stat-value" data-testid="latest-value">
                {formatValue(indicator.unit, latest.value)}
              </span>
            </div>
            <div className="stat">
              <span className="muted small">Year over year</span>
              <span className="stat-value" style={{ fontSize: 20 }}>
                <VariationCell point={latest} />
              </span>
            </div>
          </div>
        ) : null}
        <SeriesChart unit={indicator.unit} points={points} name={indicator.name} />
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="obs-heading">
          <div className="card-head">
            <h2 id="obs-heading">Observations</h2>
            <span className="muted small">{points.length} total</span>
          </div>
          {points.length > 0 ? (
            <SeriesTable unit={indicator.unit} points={points} />
          ) : (
            <p className="muted">None yet.</p>
          )}
        </section>

        <div className="stack">
          {indicator.status === 'draft' ? (
            <section className="card" aria-labelledby="add-heading">
              <div className="card-head">
                <h2 id="add-heading">Add observation</h2>
              </div>
              <ObservationForm
                unit={indicator.unit}
                frequency={indicator.frequency}
                action={addObservationAction.bind(null, indicator.id)}
              />
            </section>
          ) : (
            <section className="card">
              <p className="muted small">
                Observations can only be added while an indicator is a draft. Published figures are
                kept as they were cited.
              </p>
            </section>
          )}
          <section className="card" aria-labelledby="status-heading">
            <div className="card-head">
              <h2 id="status-heading">Lifecycle</h2>
            </div>
            <StatusActions
              status={indicator.status}
              observationCount={points.length}
              action={changeStatusAction.bind(null, indicator.id)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
