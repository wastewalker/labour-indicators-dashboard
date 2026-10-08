'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api/config';
import { STATUSES, UNITS, FREQUENCIES } from '@/lib/api/types';
import type { Frequency, IndicatorStatus, Unit } from '@/lib/api/types';
import { normalisePeriod } from '@/lib/domain';
import { errorState, readString } from '@/lib/forms';
import type { FormState } from '@/lib/forms';

/**
 * Server actions. The browser never talks to the API: forms post here, these
 * call the API from the server, and the API's verdict comes back as form state.
 */

function oneOf<T extends string>(options: readonly T[], value: string): T | null {
  return (options as readonly string[]).includes(value) ? (value as T) : null;
}

export async function createIndicatorAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    code: readString(formData, 'code').trim(),
    name: readString(formData, 'name').trim(),
    unit: readString(formData, 'unit'),
    frequency: readString(formData, 'frequency'),
  };
  const unit = oneOf<Unit>(UNITS, values.unit);
  const frequency = oneOf<Frequency>(FREQUENCIES, values.frequency);
  if (!unit || !frequency) {
    return { status: 'error', message: 'Choose a unit and a frequency.', values };
  }

  let id: string;
  try {
    const created = await api.create({ code: values.code, name: values.name, unit, frequency });
    id = created.id;
  } catch (error) {
    return errorState(error, values);
  }
  revalidatePath('/');
  // Outside the try: redirect() works by throwing, and must not be swallowed.
  redirect(`/indicators/${id}`);
}

export async function addObservationAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    period: normalisePeriod(readString(formData, 'period')),
    value: readString(formData, 'value').trim(),
  };
  const value = Number(values.value);
  if (values.value === '' || !Number.isFinite(value)) {
    return { status: 'error', fieldErrors: { value: 'Value must be a number' }, values };
  }
  try {
    await api.addObservation(id, values.period, value);
  } catch (error) {
    return errorState(error, values);
  }
  revalidatePath(`/indicators/${id}`);
  return { status: 'success' };
}

export async function changeStatusAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const status = oneOf<IndicatorStatus>(STATUSES, readString(formData, 'status'));
  if (!status) return { status: 'error', message: 'Unknown status.' };
  try {
    await api.changeStatus(id, status);
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/indicators/${id}`);
  revalidatePath('/');
  return { status: 'success' };
}
