import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="card empty">
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Indicator not found</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        It may have been removed, or the link is wrong.
      </p>
      <Link href="/" className="button">
        Back to all indicators
      </Link>
    </section>
  );
}
