import { describe, test, expect } from 'vitest';
import {
  getCurrentStatus,
  getCurrentStatusDotColor,
  getStatusRgb,
  sortStoresByCurrentStatus,
} from './status';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe('getCurrentStatus', () => {
  test('returns empty string for missing store', () => {
    expect(getCurrentStatus(null)).toBe('');
    expect(getCurrentStatus(undefined)).toBe('');
  });

  test('maps CLOSED / Closed to "Closed"', () => {
    expect(getCurrentStatus({ status: 'CLOSED' })).toBe('Closed');
    expect(getCurrentStatus({ status: 'Closed' })).toBe('Closed');
  });

  test('maps READY_TO_GO_LIVE to "Ready to Go Live"', () => {
    expect(getCurrentStatus({ status: 'READY_TO_GO_LIVE' })).toBe('Ready to Go Live');
  });

  test('treats any non-live/non-closed status as "Upcoming Store"', () => {
    expect(getCurrentStatus({ status: 'IN_PIPELINE' })).toBe('Upcoming Store');
    expect(getCurrentStatus({ status: 'ON_HOLD' })).toBe('Upcoming Store');
  });

  test('LIVE launched < 30 days ago is "Newly Launched"', () => {
    expect(getCurrentStatus({ status: 'LIVE', launchDate: daysAgo(5) })).toBe('Newly Launched');
  });

  test('LIVE launched >= 30 days ago is "Active"', () => {
    expect(getCurrentStatus({ status: 'LIVE', launchDate: daysAgo(90) })).toBe('Active');
  });

  test('LIVE with no dates defaults to "Newly Launched"', () => {
    expect(getCurrentStatus({ status: 'LIVE' })).toBe('Newly Launched');
  });

  test('LIVE prefers the earliest of in-store / delivery live dates', () => {
    const store = {
      status: 'LIVE',
      inStoreLive: true,
      inStoreLiveDate: daysAgo(200),
      deliveryLive: true,
      deliveryLiveDate: daysAgo(2),
    };
    // earliest date (200 days ago) drives the calc -> Active
    expect(getCurrentStatus(store)).toBe('Active');
  });
});

describe('status colour mappings', () => {
  test('dot colour falls back to slate for unknown status', () => {
    expect(getCurrentStatusDotColor('Active')).toBe('#22c55e');
    expect(getCurrentStatusDotColor('Nonexistent')).toBe('#9ca3af');
  });
  test('rgb mapping falls back to slate for unknown status', () => {
    expect(getStatusRgb('Closed')).toBe('239, 68, 68');
    expect(getStatusRgb('Nonexistent')).toBe('156, 163, 175');
  });
});

describe('sortStoresByCurrentStatus', () => {
  test('non-array input returns an empty array', () => {
    expect(sortStoresByCurrentStatus(null)).toEqual([]);
    expect(sortStoresByCurrentStatus(undefined)).toEqual([]);
  });

  test('orders by status priority then by name', () => {
    const stores = [
      { cafeName: 'Zeta', status: 'CLOSED' },              // Closed (5)
      { cafeName: 'Alpha', status: 'LIVE', launchDate: daysAgo(90) }, // Active (4)
      { cafeName: 'Beta', status: 'READY_TO_GO_LIVE' }, // Ready to Go Live (1)
      { cafeName: 'Gamma', status: 'IN_PIPELINE' },        // Upcoming Store (2)
      { cafeName: 'Delta', status: 'LIVE', launchDate: daysAgo(5) },  // Newly Launched (3)
    ];
    const ordered = sortStoresByCurrentStatus(stores).map((s) => s.cafeName);
    expect(ordered).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha', 'Zeta']);
  });

  test('does not mutate the input array', () => {
    const stores = [{ cafeName: 'B', status: 'CLOSED' }, { cafeName: 'A', status: 'COMPLIANCE_APPROVED' }];
    const copy = [...stores];
    sortStoresByCurrentStatus(stores);
    expect(stores).toEqual(copy);
  });
});
