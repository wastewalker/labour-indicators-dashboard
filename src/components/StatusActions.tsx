'use client';

import { useActionState } from 'react';
import type { IndicatorStatus } from '@/lib/api/types';
import { availableTransitions } from '@/lib/domain';
import { initialFormState } from '@/lib/forms';
import type { FormAction } from '@/lib/forms';
import { FormMessage } from './FormMessage';

const VERB: Record<IndicatorStatus, string> = {
  draft: 'Return to draft',
  published: 'Publish',
  archived: 'Archive',
};

interface StatusActionsProps {
  status: IndicatorStatus;
  observationCount: number;
  action: FormAction;
}

/** Only the lifecycle moves the API would accept are offered. */
export function StatusActions({ status, observationCount, action }: StatusActionsProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const transitions = availableTransitions(status, observationCount);

  if (transitions.length === 0) {
    return <p className="muted">Archived indicators are final.</p>;
  }

  return (
    <div className="stack-sm">
      <FormMessage state={state} />
      <form action={formAction} className="row" aria-label="Change status">
        {transitions.map((transition) => (
          <button
            key={transition.status}
            type="submit"
            name="status"
            value={transition.status}
            className={transition.status === 'published' ? 'button button-primary' : 'button'}
            disabled={pending || !transition.enabled}
            title={transition.reason}
          >
            {VERB[transition.status]}
          </button>
        ))}
      </form>
      {transitions
        .filter((transition) => transition.reason)
        .map((transition) => (
          <p key={transition.status} className="muted small">
            {transition.reason}
          </p>
        ))}
    </div>
  );
}
