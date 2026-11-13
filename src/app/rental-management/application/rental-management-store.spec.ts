import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { RentalManagementStore } from './rental-management-store';
import { RentalManagementApi } from '../infrastructure/rental-management-api';
import { ProfilesManagementStore } from '../../profiles-management/application/profiles-management-store';
import { IdentityAccessStore } from '../../identity-access-management/application/identity-access-store';
import { Rental } from '../domain/model/rental.entity';
import { RentalPeriod } from '../domain/model/rental-period.value-object';
import { RentalStatus } from '../domain/model/rental-status';
import { Money } from '../domain/model/money.value-object';

describe('RentalManagementStore', () => {
  let store: RentalManagementStore;
  let api: {
    getMyReservations: ReturnType<typeof vi.fn>;
    getFleetRentals: ReturnType<typeof vi.fn>;
    confirmRental: ReturnType<typeof vi.fn>;
    cancelRental: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getMyReservations: vi.fn().mockReturnValue(of([])),
      getFleetRentals: vi.fn().mockReturnValue(of([])),
      confirmRental: vi.fn(),
      cancelRental: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RentalManagementStore,
        { provide: RentalManagementApi, useValue: api },
        {
          provide: ProfilesManagementStore,
          useValue: { currentProfile: () => null, hasProfile: () => false },
        },
        {
          provide: IdentityAccessStore,
          useValue: { isSignedIn: () => false, hasRole: () => false, hasAnyRole: () => false },
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

    expect(api.confirmRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe('Only requested reservations can be confirmed.');
  });

  it('should not cancel a reservation that is already cancelled', () => {
    store.cancelReservation(createRental(RentalStatus.Cancelled), 'Another reason');

    expect(api.cancelRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe(
      'Cancelled or completed reservations cannot be cancelled again.',
    );
  });

  it('should not cancel a completed reservation', () => {
    store.cancelReservation(createRental(RentalStatus.Completed), 'Test reason');

    expect(api.cancelRental).not.toHaveBeenCalled();
    expect(store.saveError()).toBe(
      'Cancelled or completed reservations cannot be cancelled again.',
    );
  });
});
