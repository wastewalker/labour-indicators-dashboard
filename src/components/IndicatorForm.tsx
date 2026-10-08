'use client';

import { useActionState, useState } from 'react';
import type { FormEvent } from 'react';
import { FREQUENCIES, UNITS } from '@/lib/api/types';
import type { Frequency, Unit } from '@/lib/api/types';
import { FREQUENCY_META, UNIT_META, validateCode, validateName } from '@/lib/domain';
import { describeVariationKind } from '@/lib/format';
import { collectErrors, initialFormState, readString } from '@/lib/forms';
import type { FormAction } from '@/lib/forms';
import { Field } from './Field';
import { FormMessage } from './FormMessage';

/**
 * Create an indicator. The form reacts to its own choices: picking a unit
 * explains how the series' variation will be expressed, and picking a frequency
 * shows the period format every observation will need.
 */
export function IndicatorForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [unit, setUnit] = useState<Unit>('percentage');
  const [frequency, setFrequency] = useState<Frequency>('quarterly');
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);

  const errors = clientErrors ?? state.fieldErrors ?? {};
  const kind = unit === 'percentage' ? 'percentage_points' : 'percent_change';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const found = collectErrors({
      code: validateCode(readString(data, 'code')),
      name: validateName(readString(data, 'name')),
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
      aria-label="New indicator"
    >
      <FormMessage state={state} />
      <div className="form-grid">
        <Field id="code" label="Code" hint="Public handle, e.g. UNEMP_RATE" error={errors.code}>
          {(aria) => (
            <input
              {...aria}
              name="code"
              className="input mono"
              autoComplete="off"
              defaultValue={state.values?.code ?? ''}
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = input.value.toUpperCase();
              }}
            />
          )}
        </Field>
        <Field id="name" label="Name" error={errors.name}>
          {(aria) => (
            <input
              {...aria}
              name="name"
              className="input"
              maxLength={200}
              defaultValue={state.values?.name ?? ''}
            />
          )}
        </Field>
        <Field id="unit" label="Unit" hint={describeVariationKind(kind)} error={errors.unit}>
          {(aria) => (
            <select
              {...aria}
              name="unit"
              className="input"
              value={unit}
              onChange={(event) => setUnit(event.target.value as Unit)}
            >
              {UNITS.map((value) => (
                <option key={value} value={value}>
                  {UNIT_META[value].label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          id="frequency"
          label="Frequency"
          hint={`Periods are written ${FREQUENCY_META[frequency].format}, e.g. ${FREQUENCY_META[frequency].example}`}
          error={errors.frequency}
        >
          {(aria) => (
            <select
              {...aria}
              name="frequency"
              className="input"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
            >
              {FREQUENCIES.map((value) => (
                <option key={value} value={value}>
                  {FREQUENCY_META[value].label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}
