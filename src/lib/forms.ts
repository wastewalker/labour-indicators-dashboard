import { ApiError, fieldErrorsFrom } from './api/errors';

/**
 * The state every form action returns. `values` echoes what was submitted so an
 * uncontrolled form can re-populate itself after React resets it on an error.
 */
export interface FormState {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: 'idle' };

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/** Turn whatever the API threw into something a form can show. */
export function errorState(error: unknown, values?: Record<string, string>): FormState {
  if (error instanceof ApiError) {
    const fieldErrors = fieldErrorsFrom(error);
    const message = error.isUnreachable
      ? 'The indicators API is not reachable right now. Check that it is running and try again.'
      : error.message;
    return {
      status: 'error',
      message,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      ...(values ? { values } : {}),
    };
  }
  return {
    status: 'error',
    message: 'Something went wrong. Please try again.',
    ...(values ? { values } : {}),
  };
}

/** Drop null entries so a validation map only holds real errors. */
export function collectErrors(
  entries: Record<string, string | null>,
): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const [key, message] of Object.entries(entries)) {
    if (message) result[key] = message;
  }
  return Object.keys(result).length > 0 ? result : null;
}
