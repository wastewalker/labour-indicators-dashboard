'use client';

import { useEffect } from 'react';

/**
 * Shown when a page fails to load — in practice, almost always because the API
 * is not running. The message is generic on purpose: production builds hide the
 * server error's text from the browser.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="card empty" role="alert">
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Could not load indicators</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        The indicators API may be down or unreachable. Check that it is running and that
        INDICATORS_API_URL points at it.
      </p>
      <button type="button" className="button button-primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
