import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormAction } from '@/lib/forms';
import { StatusActions } from './StatusActions';

describe('StatusActions', () => {
  it('offers publish and archive for a ready draft, and sends the choice', async () => {
    const action = vi.fn<FormAction>(async () => ({ status: 'success' }));
    render(<StatusActions status="draft" observationCount={3} action={action} />);

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]![1].get('status')).toBe('published');
    expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled();
  });

  it('disables publishing until there are two observations, and says so', () => {
    render(<StatusActions status="draft" observationCount={1} action={vi.fn<FormAction>()} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/at least 2 observations/)).toBeInTheDocument();
  });

  it('only allows archiving once published', () => {
    render(<StatusActions status="published" observationCount={5} action={vi.fn<FormAction>()} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Archive']);
  });

  it('offers nothing for an archived series', () => {
    render(<StatusActions status="archived" observationCount={5} action={vi.fn<FormAction>()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/final/)).toBeInTheDocument();
  });

  it('shows a refused transition', async () => {
    const action = vi.fn<FormAction>(async () => ({
      status: 'error',
      message: "Cannot move indicator from 'draft' to 'archived'",
    }));
    render(<StatusActions status="draft" observationCount={2} action={action} />);
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot move indicator');
  });
});
