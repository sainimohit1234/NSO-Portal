import { describe, test, expect } from 'vitest';
import { normalizeListResponse } from './api';

describe('normalizeListResponse', () => {
  test('returns an array payload unchanged', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(normalizeListResponse(arr)).toBe(arr);
  });

  test('returns [] for null / non-object payloads', () => {
    expect(normalizeListResponse(null)).toEqual([]);
    expect(normalizeListResponse(undefined)).toEqual([]);
    expect(normalizeListResponse('nope')).toEqual([]);
    expect(normalizeListResponse(42)).toEqual([]);
  });

  test('prefers a named key when present', () => {
    const payload = { stores: [{ id: 'a' }], data: [{ id: 'b' }] };
    expect(normalizeListResponse(payload, ['stores', 'data'])).toEqual([{ id: 'a' }]);
  });

  test('honours preferred-key order', () => {
    const payload = { data: [{ id: 'b' }], items: [{ id: 'c' }] };
    expect(normalizeListResponse(payload, ['items', 'data'])).toEqual([{ id: 'c' }]);
  });

  test('falls back to the first array value when no preferred key matches', () => {
    const payload = { meta: { total: 1 }, results: [{ id: 'x' }] };
    expect(normalizeListResponse(payload, ['stores'])).toEqual([{ id: 'x' }]);
  });

  test('returns [] when the object holds no arrays', () => {
    expect(normalizeListResponse({ a: 1, b: 'two' }, ['stores'])).toEqual([]);
  });
});
