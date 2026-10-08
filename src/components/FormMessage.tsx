import type { FormState } from '@/lib/forms';

/** The form-level outcome: an error banner, or a quiet confirmation. */
export function FormMessage({ state, success }: { state: FormState; success?: string }) {
  if (state.status === 'error' && state.message) {
    return (
      <p className="banner banner-error" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === 'success' && success) {
    return (
      <p className="banner banner-success" role="status">
        {success}
      </p>
    );
  }
  return null;
}
