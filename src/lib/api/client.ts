import { ApiError, isApiErrorBody } from './errors';
import type {
  CreateIndicatorInput,
  Indicator,
  IndicatorList,
  IndicatorStatus,
  Series,
} from './types';

export interface ListParams {
  status?: IndicatorStatus;
  limit?: number;
  offset?: number;
}

export interface IndicatorsApi {
  list(params?: ListParams): Promise<IndicatorList>;
  get(id: string): Promise<Indicator>;
  create(input: CreateIndicatorInput): Promise<Indicator>;
  addObservation(id: string, period: string, value: number): Promise<void>;
  changeStatus(id: string, status: IndicatorStatus): Promise<Indicator>;
  getSeries(id: string): Promise<Series>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * A thin typed client over the REST API.
 *
 * `fetch` is injected so the client is tested against canned responses with no
 * network and no module mocking. Every non-2xx answer becomes an ApiError that
 * carries the API's own code and message; the UI never parses bodies itself.
 */
export function createIndicatorsApi(baseUrl: string, fetchImpl: FetchLike = fetch): IndicatorsApi {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        // Indicator data changes through this same UI; serving it from a cache
        // would show a draft without the observation that was just added.
        cache: 'no-store',
      });
    } catch (cause) {
      throw new ApiError(
        0,
        'API_UNREACHABLE',
        `The indicators API at ${root} could not be reached`,
        cause instanceof Error ? cause.message : String(cause),
      );
    }

    if (response.status === 204) return undefined as T;

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (isApiErrorBody(body)) {
        throw new ApiError(
          response.status,
          body.error.code,
          body.error.message,
          body.error.details,
        );
      }
      throw new ApiError(
        response.status,
        'UNEXPECTED_RESPONSE',
        `The API answered ${response.status}`,
      );
    }

    return body as T;
  }

  const json = (value: unknown): string => JSON.stringify(value);
  const id = (value: string): string => encodeURIComponent(value);

  return {
    list(params = {}) {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      if (params.offset !== undefined) query.set('offset', String(params.offset));
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      return request<IndicatorList>(`/api/indicators${suffix}`);
    },
    get: (indicatorId) => request<Indicator>(`/api/indicators/${id(indicatorId)}`),
    create: (input) => request<Indicator>('/api/indicators', { method: 'POST', body: json(input) }),
    addObservation: (indicatorId, period, value) =>
      request<void>(`/api/indicators/${id(indicatorId)}/observations`, {
        method: 'POST',
        body: json({ period, value }),
      }),
    changeStatus: (indicatorId, status) =>
      request<Indicator>(`/api/indicators/${id(indicatorId)}/status`, {
        method: 'PATCH',
        body: json({ status }),
      }),
    getSeries: (indicatorId) => request<Series>(`/api/indicators/${id(indicatorId)}/series`),
  };
}
