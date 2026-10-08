import type { SeriesPoint, Unit } from '@/lib/api/types';
import { formatValue } from '@/lib/format';
import { VariationCell } from './VariationCell';

export function SeriesTable({ unit, points }: { unit: Unit; points: SeriesPoint[] }) {
  // Newest first: the latest figure is what a reader looks for.
  const rows = [...points].reverse();
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Observations, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col" className="num">
              Value
            </th>
            <th scope="col" className="num">
              Year over year
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((point) => (
            <tr key={point.period}>
              <td className="mono">{point.period}</td>
              <td className="num mono">{formatValue(unit, point.value)}</td>
              <td className="num">
                <VariationCell point={point} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
