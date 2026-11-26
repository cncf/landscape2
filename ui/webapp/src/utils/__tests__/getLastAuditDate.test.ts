import { describe, expect, it } from 'vitest';

import type { SecurityAudit } from '../../types';
import getLastAuditDate from '../getLastAuditDate';

describe('getLastAuditDate', () => {
  it('returns undefined for no audits', () => {
    expect(getLastAuditDate(undefined)).toBeUndefined();
    expect(getLastAuditDate([])).toBeUndefined();
  });

  it('returns the date of a single audit', () => {
    expect(getLastAuditDate([createAudit('2023-04-10')])).toBe('2023-04-10');
  });

  it('returns the latest date of several unsorted audits', () => {
    expect(getLastAuditDate([createAudit('2021-06-01'), createAudit('2024-02-10'), createAudit('2022-11-30')])).toBe(
      '2024-02-10'
    );
  });

  it('leaves the audits in their original order', () => {
    const audits = [createAudit('2021-06-01'), createAudit('2024-02-10'), createAudit('2022-11-30')];

    getLastAuditDate(audits);

    expect(audits.map((audit) => audit.date)).toEqual(['2021-06-01', '2024-02-10', '2022-11-30']);
  });
});

// Helpers.

/** Creates a security audit made on the given date. */
function createAudit(date: string): SecurityAudit {
  return { date, type: 'security', url: `https://example.com/audit-${date}`, vendor: 'Audit vendor' };
}
