import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { ServiceOperation } from '../domain/model/service-operation.entity';
import { OperationsManagementApi } from '../infrastructure/operations-management-api';

@Injectable({
  providedIn: 'root',
})
export class OperationsManagementStore {
  readonly #api = inject(OperationsManagementApi);

  readonly #operations = signal<ServiceOperation[]>([]);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);
  readonly #saving = signal(false);
  readonly #saveError = signal<string | null>(null);

  readonly operations = this.#operations.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly saveError = this.#saveError.asReadonly();

  readonly inProgressCount = computed(
    () => this.#operations().filter((operation) => operation.isInProgress()).length,
  );

  /** Only the rental's contractor and the machinery owner can read its operation, so it is loaded per rental. */
  loadOperationForRental(rentalId: number): void {
    this.#loading.set(true);
    this.#error.set(null);

    this.#api
      .getServiceOperationByRentalId(rentalId)
      .pipe(finalize(() => this.#loading.set(false)))
      .subscribe({
        next: (operation) => {
          const others = this.#operations().filter((item) => item.rentalId !== rentalId);
          this.#operations.set(operation ? [...others, operation] : others);
        },
        error: (error: Error) => this.#error.set(error.message),
      });
  }

  operationByRentalId(rentalId: number): ServiceOperation | undefined {
    return this.#operations().find((operation) => operation.rentalId === rentalId);
  }

  startOperation(rentalId: number, machineryId: number, onSuccess: (created: ServiceOperation) => void): void {
    this.#saving.set(true);
    this.#persist(this.#api.startServiceOperation(rentalId, machineryId), onSuccess);
  }

  recordWorkedHours(
    operation: ServiceOperation,
    record: { workDate: Date; startTime: string; endTime: string; totalHours: number; observations: string | null },
  ): void {
    this.#persist(
      this.#api.recordWorkedHours(operation.id, {
        workDate: record.workDate.toISOString().slice(0, 10),
        startTime: `${record.startTime}:00`,
        endTime: `${record.endTime}:00`,
        observations: record.observations,
      }),
    );
  }

  validateWorkedHours(operation: ServiceOperation, workedHoursId: number, approve: boolean): void {
    this.#persist(this.#api.validateWorkedHours(operation.id, workedHoursId, approve));
  }

  completeOperation(operation: ServiceOperation): void {
    this.#persist(this.#api.completeServiceOperation(operation.id));
  }

  #persist(request: Observable<ServiceOperation>, onSuccess: (saved: ServiceOperation) => void = () => {}): void {
    this.#saveError.set(null);
    request.pipe(finalize(() => this.#saving.set(false))).subscribe({
      next: (saved) => {
        const others = this.#operations().filter((item) => item.id !== saved.id);
        this.#operations.set([...others, saved]);
        onSuccess(saved);
      },
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }
}
