import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { finalize, forkJoin, map, Observable, retry } from 'rxjs';
import { IdentityAccessStore } from '../../identity-access-management/application/identity-access-store';
import { RoleName } from '../../identity-access-management/domain/model/role-name';
import { ProfilesManagementStore } from '../../profiles-management/application/profiles-management-store';
import { Rental } from '../domain/model/rental.entity';
import { RentalPeriod } from '../domain/model/rental-period.value-object';
import { RentalStatus } from '../domain/model/rental-status';
import { RentalManagementApi } from '../infrastructure/rental-management-api';

const BLOCKING_STATUSES: RentalStatus[] = [
  RentalStatus.Requested,
  RentalStatus.Confirmed,
  RentalStatus.InProgress,
];

@Injectable({
  providedIn: 'root',
})
export class RentalManagementStore {
  readonly #api = inject(RentalManagementApi);
  readonly #identityAccessStore = inject(IdentityAccessStore);
  readonly #profilesManagementStore = inject(ProfilesManagementStore);

  readonly #rentals = signal<Rental[]>([]);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);
  readonly #saving = signal(false);
  readonly #saveError = signal<string | null>(null);

  readonly rentals = this.#rentals.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly saveError = this.#saveError.asReadonly();

  readonly myReservations = computed(() => {
    const profile = this.#profilesManagementStore.currentProfile();

    if (!profile) {
      return [];
    }

    return this.#rentals().filter((rental) => rental.contractorProfileId === profile.id);
  });

  readonly pendingRequestsCount = computed(
    () => this.#rentals().filter((rental) => rental.isPending()).length,
  );

  constructor() {
    effect(() => {
      const signedIn = this.#identityAccessStore.isSignedIn();
      const hasProfile = this.#profilesManagementStore.hasProfile();
      untracked(() => (signedIn && hasProfile ? this.loadRentals() : this.#rentals.set([])));
    });
  }

  /** Contractors see the rentals they requested and fleet owners every rental of their machinery. */
  loadRentals(): void {
    const sources: Observable<Rental[]>[] = [];
    if (this.#identityAccessStore.hasRole(RoleName.Contractor)) {
      sources.push(this.#api.getMyReservations());
    }
    if (this.#identityAccessStore.hasAnyRole([RoleName.FleetOwner, RoleName.FleetAdministrator])) {
      sources.push(this.#api.getFleetRentals());
    }
    if (sources.length === 0) {
      this.#rentals.set([]);
      return;
    }

    this.#loading.set(true);
    this.#error.set(null);

    forkJoin(sources)
      .pipe(
        map((lists) => [...new Map(lists.flat().map((rental) => [rental.id, rental])).values()]),
        retry(2),
        finalize(() => this.#loading.set(false)),
      )
      .subscribe({
        next: (rentals) => this.#rentals.set(rentals),
        error: (error: Error) => {
          this.#rentals.set([]);
          this.#error.set(error.message);
        },
      });
  }

  rentalsForMachinery(machineryId: number): Rental[] {
    return this.#rentals().filter((rental) => rental.machineryId === machineryId);
  }

  hasOverlappingActiveRental(machineryId: number, period: RentalPeriod): boolean {
    return this.rentalsForMachinery(machineryId).some(
      (rental) => BLOCKING_STATUSES.includes(rental.status) && rental.period.overlaps(period),
    );
  }

  requestRental(rental: Rental, onSuccess: () => void): void {
    this.#saving.set(true);
    this.#saveError.set(null);

    this.#api
      .requestRental(rental)
      .pipe(finalize(() => this.#saving.set(false)))
      .subscribe({
        next: (created) => {
          this.#rentals.set([...this.#rentals(), created]);
          onSuccess();
        },
        error: (error: Error) => this.#saveError.set(error.message),
      });
  }

  confirmReservation(rental: Rental): void {
    if (rental.status !== RentalStatus.Requested) {
      this.#saveError.set('Only requested reservations can be confirmed.');
      return;
    }
    this.#saveError.set(null);

    this.#api.confirmRental(rental.id).subscribe({
      next: (updated) =>
        this.#rentals.set(this.#rentals().map((item) => (item.id === updated.id ? updated : item))),
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }

  cancelReservation(rental: Rental, reason: string): void {
    if (
      rental.status === RentalStatus.Cancelled ||
      rental.status === RentalStatus.Completed
    ) {
      this.#saveError.set(
        'Cancelled or completed reservations cannot be cancelled again.',
      );
      return;
    }
    this.#saveError.set(null);

    this.#api.cancelRental(rental.id, reason).subscribe({
      next: (updated) =>
        this.#rentals.set(this.#rentals().map((item) => (item.id === updated.id ? updated : item))),
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }
}
