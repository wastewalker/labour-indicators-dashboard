import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormAction } from '@/lib/forms';
import { IndicatorForm } from './IndicatorForm';

describe('IndicatorForm', () => {
  it('explains the variation that the chosen unit implies', async () => {
    render(<IndicatorForm action={vi.fn<FormAction>()} />);
    expect(screen.getByText(/percentage points/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'count');
    expect(screen.getByText(/relative change/)).toBeInTheDocument();
  });

  it('shows the period format for the chosen frequency', async () => {
    render(<IndicatorForm action={vi.fn<FormAction>()} />);
    expect(screen.getByText(/YYYY-Qn, e.g. 2024-Q1/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Frequency'), 'monthly');
    expect(screen.getByText(/YYYY-Mnn, e.g. 2024-M01/)).toBeInTheDocument();
  });

  it('upper-cases the code as it is typed', async () => {
    render(<IndicatorForm action={vi.fn<FormAction>()} />);
    await userEvent.type(screen.getByLabelText('Code'), 'unemp_rate');
    expect(screen.getByLabelText('Code')).toHaveValue('UNEMP_RATE');
  });

  it('blocks an invalid code before calling the server', async () => {
    const action = vi.fn<FormAction>(async () => ({ status: 'idle' }));
    render(<IndicatorForm action={action} />);
    await userEvent.type(screen.getByLabelText('Code'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText(/Use 3-32 characters/)).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('sends every field and shows a server-side conflict', async () => {
    const action = vi.fn<FormAction>(async () => ({
      status: 'error',
      message: "An indicator with code 'UNEMP_RATE' already exists",
      values: { code: 'UNEMP_RATE', name: 'Unemployment rate' },
    }));
    render(<IndicatorForm action={action} />);
    await userEvent.type(screen.getByLabelText('Code'), 'UNEMP_RATE');
    await userEvent.type(screen.getByLabelText('Name'), 'Unemployment rate');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'index');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0]![1];
    expect(Object.fromEntries(data)).toEqual({
      code: 'UNEMP_RATE',
      name: 'Unemployment rate',
      unit: 'index',
      frequency: 'quarterly',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByLabelText('Name')).toHaveValue('Unemployment rate');
  });

  it('marks fields the API rejected', async () => {
    const action = vi.fn<FormAction>(async () => ({
      status: 'error',
      message: 'Request body or query parameters are invalid',
      fieldErrors: { name: 'Too long' },
    }));
    render(<IndicatorForm action={action} />);
    await userEvent.type(screen.getByLabelText('Code'), 'ABC');
    await userEvent.type(screen.getByLabelText('Name'), 'Fine');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByText('Too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });
});
