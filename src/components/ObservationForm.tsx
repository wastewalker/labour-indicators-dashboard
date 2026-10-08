'use client';

import { useActionState, useState } from 'react';
import type { FormEvent } from 'react';
import type { Frequency, Unit } from '@/lib/api/types';
import { FREQUENCY_META, UNIT_META, validatePeriod, validateValue } from '@/lib/domain';
import { collectErrors, initialFormState, readString } from '@/lib/forms';
import type { FormAction } from '@/lib/forms';
import { Field } from './Field';
import { FormMessage } from './FormMessage';

interface ObservationFormProps {
  unit: Unit;
  frequency: Frequency;
  action: FormAction;
}

/**
 * Add one observation. The fields are generated from the series itself: the
 * period field's format, pattern and example follow the frequency, and the value
 * field's step, bounds and hint follow the unit.
 */
export function ObservationForm({ unit, frequency, action }: ObservationFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const period = FREQUENCY_META[frequency];
  const value = UNIT_META[unit];
  const errors = clientErrors ?? state.fieldErrors ?? {};
  // After a success React resets the form; leaving `values` out makes it empty.
  const defaults = state.status === 'error' ? (state.values ?? {}) : {};

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const found = collectErrors({
      period: validatePeriod(frequency, readString(data, 'period')),
      value: validateValue(unit, readString(data, 'value')),
    });
    setClientErrors(found);
    if (found) event.preventDefault();
  }

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="form"
      aria-label="Add observation"
    >
      <FormMessage state={state} success="Observation added." />
      <div className="form-grid">
        <Field
          id="period"
          label="Period"
          hint={`${period.label}: ${period.format}, e.g. ${period.example}`}
          error={errors.period}
        >
          {(aria) => (
            <input
              {...aria}
              name="period"
              className="input mono"
              placeholder={period.example}
              pattern={period.htmlPattern}
              autoComplete="off"
              defaultValue={defaults.period ?? ''}
            />
          )}
        </Field>
        <Field
          id="value"
          label={`Value (${value.label.toLowerCase()})`}
          hint={value.hint}
          error={errors.value}
        >
          {(aria) => (
            <input
              {...aria}
              name="value"
              className="input mono"
              type="number"
              inputMode="decimal"
              step={value.step}
              min={value.min}
              {...(value.max < Number.MAX_SAFE_INTEGER ? { max: value.max } : {})}
              defaultValue={defaults.value ?? ''}
            />
          )}
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add observation'}
        </button>
      </div>
    </form>
  );
}
