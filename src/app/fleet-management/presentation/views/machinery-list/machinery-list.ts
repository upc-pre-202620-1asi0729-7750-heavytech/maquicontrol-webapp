import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IdentityAccessStore } from '../../../../identity-access-management/application/identity-access-store';
import { RoleName } from '../../../../identity-access-management/domain/model/role-name';
import { MaintenanceManagementStore } from '../../../../maintenance-management/application/maintenance-management-store';
import { MaintenanceStatus } from '../../../../maintenance-management/domain/model/maintenance-status';
import { ProfilesManagementStore } from '../../../../profiles-management/application/profiles-management-store';
import { FleetManagementStore } from '../../../application/fleet-management-store';
import { Machinery } from '../../../domain/model/machinery.entity';
import { MachineryStatus } from '../../../domain/model/machinery-status';

@Component({
  selector: 'app-machinery-list',
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './machinery-list.html',
  styleUrl: './machinery-list.scss',
})
export class MachineryList {
  protected readonly store = inject(FleetManagementStore);
  protected readonly maintenanceStore = inject(MaintenanceManagementStore);
  readonly #profilesManagementStore = inject(ProfilesManagementStore);
  readonly #identityAccessStore = inject(IdentityAccessStore);
  readonly #translate = inject(TranslateService);

  protected readonly canPublish = computed(() => this.#identityAccessStore.hasRole(RoleName.FleetOwner));
  protected readonly canRent = computed(() => this.#identityAccessStore.hasRole(RoleName.Contractor));

  protected readonly selectedMachineryForHistory = signal<Machinery | null>(null);
  protected readonly categoryFilter = signal('');
  protected readonly locationFilter = signal('');
  protected readonly hasFilters = computed(
    () => this.categoryFilter() !== '' || this.locationFilter() !== '',
  );
  protected readonly filteredMachinery = computed(() => {
    const categoryId = this.categoryFilter();
    const location = normalizeLocation(this.locationFilter());

    return this.store
      .machinery()
      .filter(
        (machinery) =>
          (categoryId === '' || String(machinery.categoryId) === categoryId) &&
          (location === '' ||
            [machinery.location.district, machinery.location.department].some((value) =>
              normalizeLocation(value).includes(location),
            )),
      );
  });

  protected clearFilters(): void {
    this.categoryFilter.set('');
    this.locationFilter.set('');
  }

  protected openHistory(machinery: Machinery): void {
    this.selectedMachineryForHistory.set(machinery);
    this.maintenanceStore.loadMaintenanceHistory(machinery.id);
  }

  protected retryHistory(): void {
    const machinery = this.selectedMachineryForHistory();
    if (machinery) {
      this.maintenanceStore.loadMaintenanceHistory(machinery.id);
    }
  }

  protected closeHistory(): void {
    this.selectedMachineryForHistory.set(null);
    this.maintenanceStore.clearMaintenanceHistory();
  }

  protected isOwner(machinery: Machinery): boolean {
    const profile = this.#profilesManagementStore.currentProfile();
    return !!profile && machinery.ownerProfileId === profile.id;
  }

  protected categoryName(machinery: Machinery): string {
    return this.store.categoryById(machinery.categoryId)?.name ?? '';
  }

  protected machineryStatusLabel(status: MachineryStatus): string {
    return `enums.machinery-status.${status}`;
  }

  protected machineryStatusClass(status: MachineryStatus): string {
    return status.toLowerCase().replaceAll('_', '-');
  }

  protected maintenanceStatusClass(status: MaintenanceStatus): string {
    return status.toLowerCase().replaceAll('_', '-');
  }

  protected performDelete(id: number, name: string): void {
    if (confirm(this.#translate.instant('machinery-list.confirm-delete', { name }))) {
      this.store.deleteMachinery(id);
    }
  }
}

function normalizeLocation(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase();
}
