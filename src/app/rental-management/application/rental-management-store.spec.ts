import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { RentalManagementStore } from './rental-management-store';
import { RentalManagementApi } from '../infrastructure/rental-management-api';
import { ProfilesManagementStore } from '../../profiles-management/application/profiles-management-store';
import { Rental } from '../domain/model/rental.entity';
import { RentalPeriod } from '../domain/model/rental-period.value-object';
import { RentalStatus } from '../domain/model/rental-status';
import { Money } from '../domain/model/money.value-object';

describe('RentalManagementStore', () => {
  let store: RentalManagementStore;
  let api: {
    getRentals: ReturnType<typeof vi.fn>;
    updateRental: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getRentals: vi.fn().mockReturnValue(of([])),
      updateRental: vi.fn().mockImplementation((rental: Rental) => of(rental)),
    };

    TestBed.configureTestingModule({
      providers: [
        RentalManagementStore,
        { provide: RentalManagementApi, useValue: api },
        {
          provide: ProfilesManagementStore,
          useValue: { currentProfile: () => null },
        },
      ],
    });

    store = TestBed.inject(RentalManagementStore);
  });

  function createRental(status: RentalStatus): Rental {
    return new Rental({
      id: 1,
      machineryId: 10,
      contractorProfileId: 20,
      period: RentalPeriod.fromIsoDates('2026-10-13', '2026-10-15'),
      status,
      totalAmount: new Money({ amount: 100, currency: 'PEN' }),
      cancellationReason: status === RentalStatus.Cancelled ? 'Test reason' : null,
      requestedAt: new Date('2026-10-12T10:00:00'),
      confirmedAt:
        status === RentalStatus.Confirmed || status === RentalStatus.Completed
          ? new Date('2026-10-12T11:00:00')
          : null,
      cancelledAt: status === RentalStatus.Cancelled ? new Date('2026-10-12T12:00:00') : null,
    });
  }

  it('should not confirm a reservation that is not requested', () => {
    store.confirmReservation(createRental(RentalStatus.Cancelled));

    expect(api.updateRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe('Only requested reservations can be confirmed.');
  });

  it('should not cancel a reservation that is already cancelled', () => {
    store.cancelReservation(createRental(RentalStatus.Cancelled), 'Another reason');

    expect(api.updateRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe(
      'Cancelled or completed reservations cannot be cancelled again.',
    );
  });

  it('should not cancel a completed reservation', () => {
    store.cancelReservation(createRental(RentalStatus.Completed), 'Test reason');

    expect(api.updateRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe(
      'Cancelled or completed reservations cannot be cancelled again.',
    );
  });
});
