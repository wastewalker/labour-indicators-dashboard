import { expect, test } from '@playwright/test';

const API = 'http://localhost:4010';
const UNEMPLOYMENT = '/indicators/11111111-1111-4111-8111-111111111111';
const FORMAL_JOBS = '/indicators/22222222-2222-4222-8222-222222222222';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/__reset`);
});

test('lists indicators and filters them by status through the URL', async ({ page }) => {
  await page.goto('/');
  const list = page.getByRole('region', { name: 'Indicator list' });
  await expect(list.getByRole('row')).toHaveCount(4);
  await expect(page.getByText('3 series')).toBeVisible();

  await page.getByRole('link', { name: 'Draft' }).click();
  await expect(page).toHaveURL(/\?status=draft$/);
  await expect(list.getByRole('link', { name: 'Formal employment' })).toBeVisible();
  await expect(list.getByRole('link', { name: 'Unemployment rate' })).toHaveCount(0);
});

test('shows a percentage series with changes in percentage points', async ({ page }) => {
  await page.goto(UNEMPLOYMENT);
  await expect(page.getByRole('heading', { name: 'Unemployment rate' })).toBeVisible();
  await expect(page.getByTestId('latest-value')).toHaveText('6.9%');
  await expect(page.getByText('Year-over-year change in percentage points (pp)')).toBeVisible();

  const row = page.getByRole('row', { name: /2024-Q1/ });
  await expect(row).toContainText('7.5%');
  await expect(row).toContainText('+1.5 pp');
  // Published series are closed to new observations.
  await expect(page.getByRole('form', { name: 'Add observation' })).toHaveCount(0);
});

test('creates a draft, records observations, and publishes it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'New indicator' }).click();

  await page.getByLabel('Code').fill('youth_unemp');
  await page.getByLabel('Name').fill('Youth unemployment rate');
  await page.getByLabel('Frequency').selectOption('quarterly');
  await page.getByRole('button', { name: 'Create draft' }).click();

  await expect(page).toHaveURL(/\/indicators\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Youth unemployment rate' })).toBeVisible();
  await expect(page.getByText('YOUTH_UNEMP')).toBeVisible();
  await expect(page.getByText('No observations yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();

  const form = page.getByRole('form', { name: 'Add observation' });

  // A period in the wrong shape is caught before the request is sent.
  await form.getByLabel('Period').fill('2023');
  await form.getByLabel(/Value/).fill('12');
  await form.getByRole('button', { name: 'Add observation' }).click();
  await expect(form.getByText(/Quarterly periods look like 2024-Q1/)).toBeVisible();

  await form.getByLabel('Period').fill('2023-Q1');
  await form.getByRole('button', { name: 'Add observation' }).click();
  await expect(form.getByRole('status')).toHaveText('Observation added.');
  await expect(form.getByLabel('Period')).toHaveValue('');

  await form.getByLabel('Period').fill('2024-q1');
  await form.getByLabel(/Value/).fill('13.5');
  await form.getByRole('button', { name: 'Add observation' }).click();
  await expect(page.getByRole('row', { name: /2024-Q1/ })).toContainText('+1.5 pp');

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Add observation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();
});

test("surfaces the API's refusal of a duplicate period", async ({ page }) => {
  await page.goto(FORMAL_JOBS);
  const form = page.getByRole('form', { name: 'Add observation' });
  await form.getByLabel('Period').fill('2023');
  await form.getByLabel(/Value/).fill('1300000');
  await form.getByRole('button', { name: 'Add observation' }).click();

  await expect(form.getByRole('alert')).toContainText(
    "already has an observation for period '2023'",
  );
  await expect(form.getByLabel('Period')).toHaveValue('2023');
});

test("surfaces the API's refusal of a duplicate code", async ({ page }) => {
  await page.goto('/indicators/new');
  await page.getByLabel('Code').fill('UNEMP_RATE');
  await page.getByLabel('Name').fill('Another unemployment rate');
  await page.getByRole('button', { name: 'Create draft' }).click();

  const form = page.getByRole('form', { name: 'New indicator' });
  await expect(form.getByRole('alert')).toContainText('already exists');
  await expect(page.getByLabel('Name')).toHaveValue('Another unemployment rate');
});

test('shows a not-found page for unknown or malformed ids', async ({ page }) => {
  await page.goto('/indicators/99999999-9999-4999-8999-999999999999');
  await expect(page.getByRole('heading', { name: 'Indicator not found' })).toBeVisible();

  await page.goto('/indicators/not-a-uuid');
  await expect(page.getByRole('heading', { name: 'Indicator not found' })).toBeVisible();
});
