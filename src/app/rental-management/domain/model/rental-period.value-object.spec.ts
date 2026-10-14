import { describe, expect, it } from 'vitest';
import { RentalPeriod } from './rental-period.value-object';

describe('RentalPeriod', () => {
  it('should create a period with valid ISO dates', () => {
    const period = RentalPeriod.fromIsoDates('2026-10-13', '2026-10-15');

    expect(RentalPeriod.toIsoDate(period.startDate)).toBe('2026-10-13');
    expect(RentalPeriod.toIsoDate(period.endDate)).toBe('2026-10-15');
  });

  it('should reject an invalid calendar date', () => {
    expect(() => RentalPeriod.parseIsoDate('2026-02-30')).toThrow(
      'Invalid calendar date: 2026-02-30',
    );
  });

  it('should reject an invalid ISO date format', () => {
    expect(() => RentalPeriod.parseIsoDate('13-10-2026')).toThrow(
      'Invalid ISO date format: 13-10-2026',
    );
  });

  it('should reject an end date before the start date', () => {
    expect(() => RentalPeriod.fromIsoDates('2026-10-15', '2026-10-13')).toThrow(
      'Rental period end date cannot be before the start date.',
    );
  });

  it('should count both the start and end dates', () => {
    const period = RentalPeriod.fromIsoDates('2026-10-13', '2026-10-15');

    expect(period.durationInDays()).toBe(3);
  });

  it('should detect overlapping periods that share a date', () => {
    const first = RentalPeriod.fromIsoDates('2026-10-13', '2026-10-15');
    const second = RentalPeriod.fromIsoDates('2026-10-15', '2026-10-17');

    expect(first.overlaps(second)).toBe(true);
  });
});
