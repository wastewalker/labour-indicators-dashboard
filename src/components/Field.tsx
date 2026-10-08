import type { ReactNode } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/**
 * Label, control, hint and error wired together once, so every form gets the
 * same accessible structure: the hint and the error are both announced by
 * screen readers through aria-describedby, and invalid controls say so.
 */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
