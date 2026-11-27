import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { finalize, retry } from 'rxjs';
import { IdentityAccessStore } from '../../identity-access-management/application/identity-access-store';
import { RoleName } from '../../identity-access-management/domain/model/role-name';
import { ProfilesManagementStore } from '../../profiles-management/application/profiles-management-store';
import { BreakdownSeverity } from '../domain/model/breakdown-severity';
import { Maintenance } from '../domain/model/maintenance.entity';
import { MaintenanceStatus } from '../domain/model/maintenance-status';
import { MaintenanceType } from '../domain/model/maintenance-type';
import { Money } from '../domain/model/money.value-object';
import { MaintenanceManagementApi } from '../infrastructure/maintenance-management-api';

/** Identifier the platform replaces when it stores a new maintenance. */
const UNSAVED_MAINTENANCE_ID = 1;

@Injectable({
  providedIn: 'root',
})
export class MaintenanceManagementStore {
  readonly #api = inject(MaintenanceManagementApi);
  readonly #identityAccessStore = inject(IdentityAccessStore);
  readonly #profilesManagementStore = inject(ProfilesManagementStore);

  readonly #maintenances = signal<Maintenance[]>([]);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);
  readonly #saving = signal(false);
  readonly #saveError = signal<string | null>(null);
  readonly #history = signal<Maintenance[]>([]);
  readonly #historyMachineryId = signal<number | null>(null);
  readonly #historyLoading = signal(false);
  readonly #historyError = signal<string | null>(null);

  readonly maintenances = this.#maintenances.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly saveError = this.#saveError.asReadonly();
  readonly history = this.#history.asReadonly();
  readonly historyMachineryId = this.#historyMachineryId.asReadonly();
  readonly historyLoading = this.#historyLoading.asReadonly();
  readonly historyError = this.#historyError.asReadonly();

  readonly pendingMaintenanceCount = computed(
    () => this.#maintenances().filter((maintenance) => maintenance.isPending()).length,
  );

  constructor() {
    effect(() => {
      const signedIn = this.#identityAccessStore.isSignedIn();
      const hasProfile = this.#profilesManagementStore.hasProfile();
      untracked(() => {
        if (!signedIn) {
          this.clearMaintenanceHistory();
        }
        const isOwner = this.#identityAccessStore.hasAnyRole([RoleName.FleetOwner, RoleName.FleetAdministrator]);
        if (signedIn && hasProfile && isOwner) {
          this.loadMaintenances();
          return;
        }
        this.#maintenances.set([]);
      });
    });
  }

  loadMaintenances(): void {
    this.#loading.set(true);
    this.#error.set(null);

    this.#api
      .getMaintenances()
      .pipe(
        retry(2),
        finalize(() => this.#loading.set(false)),
      )
      .subscribe({
        next: (maintenances) => this.#maintenances.set(maintenances),
        error: (error: Error) => {
          this.#maintenances.set([]);
          this.#error.set(error.message);
        },
      });
  }

  loadMaintenanceHistory(machineryId: number): void {
    this.#historyMachineryId.set(machineryId);
    this.#historyLoading.set(true);
    this.#historyError.set(null);
    this.#history.set([]);

    this.#api
      .getMaintenanceHistory(machineryId)
      .pipe(
        finalize(() => {
          if (this.#historyMachineryId() === machineryId) {
            this.#historyLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (maintenances) => {
          if (this.#historyMachineryId() === machineryId) {
            this.#history.set(maintenances);
          }
        },
        error: (error: Error) => {
          if (this.#historyMachineryId() === machineryId) {
            this.#history.set([]);
            this.#historyError.set(error.message);
          }
        },
      });
  }

  clearMaintenanceHistory(): void {
    this.#historyMachineryId.set(null);
    this.#history.set([]);
    this.#historyLoading.set(false);
    this.#historyError.set(null);
  }

  maintenanceForMachinery(machineryId: number): Maintenance[] {
    return this.#maintenances().filter((maintenance) => maintenance.machineryId === machineryId);
  }

  scheduleMaintenance(
    props: {
      machineryId: number;
      type: MaintenanceType;
      description: string;
      scheduledDate: Date;
      technicianName: string | null;
    },
    onSuccess: () => void,
  ): void {
    this.#saving.set(true);
    this.#saveError.set(null);

    const maintenance = new Maintenance({
      id: UNSAVED_MAINTENANCE_ID,
      machineryId: props.machineryId,
      type: props.type,
      status: MaintenanceStatus.Scheduled,
      description: props.description,
      scheduledDate: props.scheduledDate,
      startedAt: null,
      completedAt: null,
      technicianName: props.technicianName,
      cost: null,
      breakdownReports: [],
    });

    this.#api
      .scheduleMaintenance(maintenance)
      .pipe(finalize(() => this.#saving.set(false)))
      .subscribe({
        next: (created) => {
          this.#maintenances.set([...this.#maintenances(), created]);
          onSuccess();
        },
        error: (error: Error) => this.#saveError.set(error.message),
      });
  }

  startMaintenance(maintenance: Maintenance, onSuccess: () => void = () => {}): void {
    this.#saveError.set(null);
    this.#api.startMaintenance(maintenance.id).subscribe({
      next: (updated) => {
        this.#replace(updated);
        onSuccess();
      },
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }

  completeMaintenance(maintenance: Maintenance, cost: Money, onSuccess: () => void = () => {}): void {
    this.#saveError.set(null);
    this.#api.completeMaintenance(maintenance.id, cost).subscribe({
      next: (updated) => {
        this.#replace(updated);
        onSuccess();
      },
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }

  /** The platform opens a corrective maintenance for the reported breakdown and notifies the owner. */
  reportBreakdown(
    machineryId: number,
    report: { description: string; severity: BreakdownSeverity },
    onSuccess: () => void,
  ): void {
    this.#saving.set(true);
    this.#saveError.set(null);

    this.#api
      .reportBreakdown(machineryId, report.description, report.severity)
      .pipe(finalize(() => this.#saving.set(false)))
      .subscribe({
        next: () => onSuccess(),
        error: (error: Error) => this.#saveError.set(error.message),
      });
  }

  #replace(updated: Maintenance): void {
    this.#maintenances.set(this.#maintenances().map((item) => (item.id === updated.id ? updated : item)));
  }
}
