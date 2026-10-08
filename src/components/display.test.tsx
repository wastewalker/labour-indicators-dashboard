import { render, screen, within } from '@testing-library/react';
import type { SeriesPoint } from '@/lib/api/types';
import { Field } from './Field';
import { FormMessage } from './FormMessage';
import { Pagination, pageHref } from './Pagination';
import { SeriesChart } from './SeriesChart';
import { SeriesTable } from './SeriesTable';
import { StatusBadge } from './StatusBadge';
import { StatusFilter } from './StatusFilter';
import { VariationCell } from './VariationCell';

const points: SeriesPoint[] = [
  { period: '2023-Q1', value: 6, yearOverYear: null, variationGap: 'no_prior_year_observation' },
  {
    period: '2024-Q1',
    value: 7.5,
    yearOverYear: { kind: 'percentage_points', value: 1.5 },
    variationGap: null,
  },
];

describe('VariationCell', () => {
  it('prints percentage points with an announced direction', () => {
    render(<VariationCell point={points[1]!} />);
    const cell = screen.getByText(/\+1\.5 pp/);
    expect(cell).toHaveAttribute('data-trend', 'up');
    expect(cell).toHaveTextContent('up');
  });

  it.each([
    [-2, 'down'],
    [0, 'flat'],
  ] as const)('marks %d as %s', (value, trend) => {
    const { container } = render(
      <VariationCell
        point={{ yearOverYear: { kind: 'percent_change', value }, variationGap: null }}
      />,
    );
    expect(container.querySelector('[data-trend]')).toHaveAttribute('data-trend', trend);
  });

  it('names the reason a variation is missing', () => {
    render(<VariationCell point={points[0]!} />);
    expect(
      screen.getByText('No observation for the same period a year earlier'),
    ).toBeInTheDocument();
  });

  it('falls back when the gap reason is absent', () => {
    render(<VariationCell point={{ yearOverYear: null, variationGap: null }} />);
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });
});

describe('SeriesTable', () => {
  it('lists the newest observation first with formatted values', () => {
    render(<SeriesTable unit="percentage" points={points} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('2024-Q1')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('7.5%')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('2023-Q1')).toBeInTheDocument();
  });
});

describe('SeriesChart', () => {
  it('summarises the series for assistive tech', () => {
    render(<SeriesChart unit="percentage" points={points} name="Unemployment rate" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Unemployment rate: 2 observations from 2023-Q1 (6%) to 2024-Q1 (7.5%)',
    );
  });

  it('invites the first observation when empty', () => {
    render(<SeriesChart unit="count" points={[]} name="Jobs" />);
    expect(screen.getByText(/No observations yet/)).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('labels the status', () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText('Published')).toHaveAttribute('data-status', 'published');
  });
});

describe('StatusFilter', () => {
  it('links every status and marks the current one', () => {
    render(<StatusFilter current="draft" />);
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/');
    const draft = screen.getByRole('link', { name: 'Draft' });
    expect(draft).toHaveAttribute('href', '/?status=draft');
    expect(draft).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Published' })).not.toHaveAttribute('aria-current');
  });
});

describe('Pagination', () => {
  it('is hidden for a single page', () => {
    const { container } = render(<Pagination total={5} limit={10} offset={0} status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links neighbouring pages and keeps the filter', () => {
    render(<Pagination total={35} limit={10} offset={10} status="published" />);
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/?status=published',
    );
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/?status=published&page=3',
    );
  });

  it('disables the ends', () => {
    render(<Pagination total={20} limit={10} offset={10} status={undefined} />);
    expect(screen.getByText('Next')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/');
  });

  it('builds hrefs', () => {
    expect(pageHref(1, undefined)).toBe('/');
    expect(pageHref(2, undefined)).toBe('/?page=2');
  });
});

describe('Field and FormMessage', () => {
  it('wires hint and error into aria-describedby', () => {
    render(
      <Field id="x" label="X" hint="A hint" error="Bad">
        {(aria) => <input {...aria} />}
      </Field>,
    );
    const input = screen.getByLabelText('X');
    expect(input).toHaveAccessibleDescription('A hint Bad');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('leaves the description empty without hint or error', () => {
    render(
      <Field id="y" label="Y">
        {(aria) => <input {...aria} />}
      </Field>,
    );
    expect(screen.getByLabelText('Y')).not.toHaveAttribute('aria-describedby');
  });

  it('renders nothing for idle state or success without a message', () => {
    const { container } = render(<FormMessage state={{ status: 'success' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
