import { ApiError } from './api/errors';
import { collectErrors, errorState, readString } from './forms';

describe('errorState', () => {
  it("passes the API's message through and keeps the submitted values", () => {
    const state = errorState(new ApiError(409, 'CONFLICT', 'Code already exists'), { code: 'X' });
    expect(state).toEqual({
      status: 'error',
      message: 'Code already exists',
      values: { code: 'X' },
    });
  });

  it('attaches field errors from a validation response', () => {
    const state = errorState(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [{ path: 'name', message: 'Required' }]),
    );
    expect(state.fieldErrors).toEqual({ name: 'Required' });
  });

  it('explains an unreachable API in plain words', () => {
    const state = errorState(new ApiError(0, 'API_UNREACHABLE', 'fetch failed'));
    expect(state.message).toContain('not reachable');
  });

  it('never leaks unknown errors', () => {
    expect(errorState(new Error('secret stack'))).toEqual({
      status: 'error',
      message: 'Something went wrong. Please try again.',
    });
    expect(errorState(new Error('x'), { a: '1' }).values).toEqual({ a: '1' });
  });
});

describe('helpers', () => {
  it('reads strings from form data and ignores files', () => {
    const data = new FormData();
    data.set('name', 'Rate');
    data.set('file', new Blob(['x']));
    expect(readString(data, 'name')).toBe('Rate');
    expect(readString(data, 'file')).toBe('');
    expect(readString(data, 'missing')).toBe('');
  });

  it('collects only real errors', () => {
    expect(collectErrors({ a: null, b: 'bad' })).toEqual({ b: 'bad' });
    expect(collectErrors({ a: null })).toBeNull();
  });
});
