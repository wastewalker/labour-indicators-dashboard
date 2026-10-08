import type { IndicatorStatus } from '@/lib/api/types';
import { STATUS_LABEL } from '@/lib/domain';
import styles from './StatusBadge.module.css';

export function StatusBadge({ status }: { status: IndicatorStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
