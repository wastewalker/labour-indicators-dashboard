import type { ApiErrorBody } from './types';

/**
 * An error the API answered with, or a failure to reach it at all.
 *
 * `status` is 0 when no HTTP response arrived (API down, DNS, timeout), so the
 * UI can tell "the server said no" apart from "there is no server".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/** Field-level messages from a Zod 400, keyed by path, when the API sent them. */
export function fieldErrorsFrom(error: ApiError): Record<string, string> {
  if (!Array.isArray(error.details)) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details as unknown[]) {
    if (
      typeof issue === 'object' &&
      issue !== null &&
      typeof (issue as { path?: unknown }).path === 'string' &&
      typeof (issue as { message?: unknown }).message === 'string'
    ) {
      const { path, message } = issue as { path: string; message: string };
      result[path] ??= message;
    }
  }
  return result;
}
