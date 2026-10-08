import type { Metadata } from 'next';
import Link from 'next/link';
import { IndicatorForm } from '@/components/IndicatorForm';
import { createIndicatorAction } from '../actions';

export const metadata: Metadata = { title: 'New indicator' };

export default function NewIndicatorPage() {
  return (
    <div className="stack">
      <div>
        <Link href="/" className="back">
          ← All indicators
        </Link>
        <h1>New indicator</h1>
        <p className="muted">It starts as a draft. Add observations, then publish it.</p>
      </div>
      <section className="card">
        <IndicatorForm action={createIndicatorAction} />
      </section>
    </div>
  );
}
