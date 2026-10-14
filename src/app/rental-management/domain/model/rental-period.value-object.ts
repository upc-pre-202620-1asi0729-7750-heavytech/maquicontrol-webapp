export class RentalPeriod {
  readonly #startDate: Date;
  readonly #endDate: Date;

  constructor(props: { startDate: Date; endDate: Date }) {
    if (
      !(props.startDate instanceof Date) ||
      Number.isNaN(props.startDate.getTime()) ||
      !(props.endDate instanceof Date) ||
      Number.isNaN(props.endDate.getTime())
    ) {
      throw new Error('Rental period dates must be valid dates.');
    }

    if (props.endDate.getTime() < props.startDate.getTime()) {
      throw new Error('Rental period end date cannot be before the start date.');
    }

    this.#startDate = props.startDate;
    this.#endDate = props.endDate;
  }

  static fromIsoDates(startDate: string, endDate: string): RentalPeriod {
    return new RentalPeriod({
      startDate: RentalPeriod.parseIsoDate(startDate),
      endDate: RentalPeriod.parseIsoDate(endDate),
    });
  }

  static parseIsoDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Invalid ISO date format: ${value}`);
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);

    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error(`Invalid calendar date: ${value}`);
    }

    return date;
  }

  static toIsoDate(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error('Cannot convert an invalid date to ISO format.');
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }

  static todayIsoDate(): string {
    return RentalPeriod.toIsoDate(new Date());
  }

  get startDate(): Date {
    return this.#startDate;
  }

  get endDate(): Date {
    return this.#endDate;
  }

  durationInDays(): number {
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

    const toCalendarDay = (date: Date) =>
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

    const days = Math.round(
      (toCalendarDay(this.#endDate) - toCalendarDay(this.#startDate)) / MILLISECONDS_PER_DAY,
    );

    return Math.max(days + 1, 1);
  }

  overlaps(other: RentalPeriod): boolean {
    return (
      this.#startDate.getTime() <= other.endDate.getTime() &&
      other.startDate.getTime() <= this.#endDate.getTime()
    );
  }

  isValid(): boolean {
    return (
      !Number.isNaN(this.#startDate.getTime()) &&
      !Number.isNaN(this.#endDate.getTime()) &&
      this.#endDate.getTime() >= this.#startDate.getTime()
    );
  }
}
