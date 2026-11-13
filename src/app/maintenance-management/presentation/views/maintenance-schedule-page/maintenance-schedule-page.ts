import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FleetManagementStore } from '../../../../fleet-management/application/fleet-management-store';
import { ProfilesManagementStore } from '../../../../profiles-management/application/profiles-management-store';
import { MaintenanceManagementStore } from '../../../application/maintenance-management-store';
import { Maintenance } from '../../../domain/model/maintenance.entity';
import { MaintenanceStatus } from '../../../domain/model/maintenance-status';
import { MaintenanceType } from '../../../domain/model/maintenance-type';
import { Money } from '../../../domain/model/money.value-object';

/** Time the platform needs to relay the maintenance event to the fleet before the catalog is read again. */
const MACHINERY_REFRESH_DELAY_MS = 1500;

@Component({
  selector: 'app-maintenance-schedule-page',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, MatButtonModule, TranslatePipe],
  templateUrl: './maintenance-schedule-page.html',
  styleUrl: './maintenance-schedule-page.scss',
})
export class MaintenanceSchedulePage {
  protected readonly store = inject(MaintenanceManagementStore);
  protected readonly fleetManagementStore = inject(FleetManagementStore);
  readonly #profilesManagementStore = inject(ProfilesManagementStore);
  readonly #translate = inject(TranslateService);

  protected readonly maintenanceTypes = Object.values(MaintenanceType);

  protected readonly form = new FormGroup({
    machineryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<MaintenanceType>(MaintenanceType.Preventive, { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    scheduledDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    technicianName: new FormControl('', { nonNullable: true }),
  });

  protected get ownedMachinery() {
    const profile = this.#profilesManagementStore.currentProfile();

    if (!profile) {
      return [];
    }

    return this.fleetManagementStore
      .machinery()
      .filter((machinery) => machinery.ownerProfileId === profile.id);
  }

  protected get ownedMaintenance(): Maintenance[] {
    const ownedIds = new Set(this.ownedMachinery.map((machinery) => machinery.id));
    return this.store.maintenances().filter((maintenance) => ownedIds.has(maintenance.machineryId));
  }

  protected machineryName(machineryId: number): string {
    return this.fleetManagementStore.machineryById(machineryId)?.name ?? this.#translate.instant('reservations.machinery-fallback', { id: machineryId });
  }

  protected maintenanceStatusLabel(status: MaintenanceStatus): string {
    return `enums.maintenance-status.${status}`;
  }

  protected maintenanceStatusClass(status: MaintenanceStatus): string {
    return status.toLowerCase().replaceAll('_', '-');
  }

  protected performSchedule(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.store.scheduleMaintenance(
      {
        machineryId: Number(value.machineryId),
        type: value.type,
        description: value.description,
        scheduledDate: new Date(`${value.scheduledDate}T08:00:00`),
        technicianName: value.technicianName.trim() || null,
      },
      () =>
        this.form.reset({
          type: MaintenanceType.Preventive,
          description: '',
          scheduledDate: '',
          technicianName: '',
          machineryId: '',
        }),
    );
  }

  /** The platform moves the machinery to IN_MAINTENANCE and back to AVAILABLE on its own, so the catalog is refreshed. */
  protected performStart(maintenance: Maintenance): void {
    this.store.startMaintenance(maintenance, () => this.#refreshMachinery());
  }

  protected performComplete(maintenance: Maintenance): void {
    const costInput = prompt(this.#translate.instant('maintenance.cost-prompt'));

    if (costInput === null) {
      return;
    }

    const amount = Number(costInput);

    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }

    this.store.completeMaintenance(maintenance, new Money({ amount, currency: 'PEN' }), () =>
      this.#refreshMachinery(),
    );
  }

  #refreshMachinery(): void {
    setTimeout(() => this.fleetManagementStore.loadMachinery(), MACHINERY_REFRESH_DELAY_MS);
  }
}
