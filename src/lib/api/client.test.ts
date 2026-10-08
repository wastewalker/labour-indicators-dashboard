import { createIndicatorsApi } from './client';
import { ApiError, fieldErrorsFrom } from './errors';

function respond(status: number, body?: unknown) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

const indicator = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'UNEMP_RATE',
  name: 'Unemployment rate',
  unit: 'percentage',
  frequency: 'quarterly',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('createIndicatorsApi', () => {
  it('builds list queries from the filters given', async () => {
    const fetchMock = respond(200, { items: [], total: 0, limit: 10, offset: 20 });
    const api = createIndicatorsApi('http://api.test/', fetchMock);
    await api.list({ status: 'published', limit: 10, offset: 20 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/indicators?status=published&limit=10&offset=20',
    );
  });

  it('omits the query string when there are no filters', async () => {
    const fetchMock = respond(200, { items: [], total: 0, limit: 20, offset: 0 });
    await createIndicatorsApi('http://api.test', fetchMock).list();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/api/indicators');
  });

  it('sends JSON bodies with the right method and headers', async () => {
    const fetchMock = respond(201, indicator);
    const api = createIndicatorsApi('http://api.test', fetchMock);
    const created = await api.create({
      code: 'UNEMP_RATE',
      name: 'Unemployment rate',
      unit: 'percentage',
      frequency: 'quarterly',
    });
    expect(created.id).toBe(indicator.id);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.cache).toBe('no-store');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('treats 204 as success with no body', async () => {
    const fetchMock = respond(204);
    const api = createIndicatorsApi('http://api.test', fetchMock);
    await expect(api.addObservation(indicator.id, '2024-Q1', 7.5)).resolves.toBeUndefined();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      period: '2024-Q1',
      value: 7.5,
    });
  });

  it('hits the right paths for read and status calls', async () => {
    const fetchMock = respond(200, indicator);
    const api = createIndicatorsApi('http://api.test', fetchMock);
    await api.get(indicator.id);
    await api.getSeries(indicator.id);
    await api.changeStatus(indicator.id, 'published');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `http://api.test/api/indicators/${indicator.id}`,
      `http://api.test/api/indicators/${indicator.id}/series`,
      `http://api.test/api/indicators/${indicator.id}/status`,
    ]);
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe('PATCH');
  });

  it("turns the API's error body into an ApiError", async () => {
    const api = createIndicatorsApi(
      'http://api.test',
      respond(409, { error: { code: 'ILLEGAL_TRANSITION', message: 'Cannot publish' } }),
    );
    const error = await api.changeStatus(indicator.id, 'published').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'ILLEGAL_TRANSITION',
      message: 'Cannot publish',
    });
    expect((error as ApiError).isUnreachable).toBe(false);
  });

  it('still fails clearly when the error body is not the API shape', async () => {
    const api = createIndicatorsApi('http://api.test', respond(502, { oops: true }));
    await expect(api.get(indicator.id)).rejects.toMatchObject({
      status: 502,
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('reports an unreachable API as status 0', async () => {
    const api = createIndicatorsApi(
      'http://api.test',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const error = (await api.list().catch((e: unknown) => e)) as ApiError;
    expect(error.isUnreachable).toBe(true);
    expect(error.code).toBe('API_UNREACHABLE');
    expect(error.details).toBe('fetch failed');
  });
});

describe('fieldErrorsFrom', () => {
  it('maps Zod issues to their field, keeping the first message', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [
      { path: 'code', message: 'Required' },
      { path: 'code', message: 'Second' },
      { path: 'unit', message: 'Invalid option' },
      'ignored',
    ]);
    expect(fieldErrorsFrom(error)).toEqual({ code: 'Required', unit: 'Invalid option' });
  });

  it('returns nothing for errors without issues', () => {
    expect(fieldErrorsFrom(new ApiError(409, 'CONFLICT', 'Exists', { code: 'X' }))).toEqual({});
  });
});
