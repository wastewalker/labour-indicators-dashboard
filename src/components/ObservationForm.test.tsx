import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormAction, FormState } from '@/lib/forms';
import { ObservationForm } from './ObservationForm';

function actionReturning(state: FormState) {
  return vi.fn<FormAction>(async () => state);
}

describe('ObservationForm', () => {
  it('builds its fields from the frequency and unit of the series', () => {
    const { rerender } = render(
      <ObservationForm
        unit="percentage"
        frequency="quarterly"
        action={actionReturning({ status: 'success' })}
      />,
    );
    expect(screen.getByLabelText('Period')).toHaveAttribute('placeholder', '2024-Q1');
    expect(screen.getByText('Quarterly: YYYY-Qn, e.g. 2024-Q1')).toBeInTheDocument();
    expect(screen.getByLabelText('Value (percentage)')).toHaveAttribute('max', '100');

    rerender(
      <ObservationForm
        unit="count"
        frequency="monthly"
        action={actionReturning({ status: 'success' })}
      />,
    );
    expect(screen.getByLabelText('Period')).toHaveAttribute('placeholder', '2024-M01');
    const value = screen.getByLabelText('Value (count)');
    expect(value).toHaveAttribute('step', '1');
    expect(value).not.toHaveAttribute('max');
  });

  it('stops a submission the API would reject and says why', async () => {
    const action = actionReturning({ status: 'success' });
    render(<ObservationForm unit="percentage" frequency="quarterly" action={action} />);

    await userEvent.type(screen.getByLabelText('Period'), '2024');
    await userEvent.type(screen.getByLabelText('Value (percentage)'), '740');
    await userEvent.click(screen.getByRole('button', { name: 'Add observation' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Period')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Quarterly periods look like 2024-Q1/)).toBeInTheDocument();
    expect(
      screen.getByText(/Between 0 and 100/, { selector: '[role="alert"]' }),
    ).toBeInTheDocument();
  });

  it('submits valid input and confirms', async () => {
    const action = actionReturning({ status: 'success' });
    render(<ObservationForm unit="percentage" frequency="quarterly" action={action} />);

    await userEvent.type(screen.getByLabelText('Period'), '2024-q1');
    await userEvent.type(screen.getByLabelText('Value (percentage)'), '7.5');
    await userEvent.click(screen.getByRole('button', { name: 'Add observation' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0]![1];
    expect(formData.get('period')).toBe('2024-q1');
    expect(formData.get('value')).toBe('7.5');
    expect(await screen.findByRole('status')).toHaveTextContent('Observation added.');
  });

  it("shows the API's verdict and keeps what was typed", async () => {
    const action = actionReturning({
      status: 'error',
      message: "Indicator already has an observation for period '2024-Q1'",
      values: { period: '2024-Q1', value: '7.5' },
    });
    render(<ObservationForm unit="percentage" frequency="quarterly" action={action} />);

    await userEvent.type(screen.getByLabelText('Period'), '2024-Q1');
    await userEvent.type(screen.getByLabelText('Value (percentage)'), '7.5');
    await userEvent.click(screen.getByRole('button', { name: 'Add observation' }));

    expect(await screen.findByText(/already has an observation/)).toBeInTheDocument();
    expect(screen.getByLabelText('Period')).toHaveValue('2024-Q1');
  });
});
