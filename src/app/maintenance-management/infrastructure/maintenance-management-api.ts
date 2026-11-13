import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { BreakdownSeverity } from '../domain/model/breakdown-severity';
import { Maintenance } from '../domain/model/maintenance.entity';
import { MaintenanceStatus } from '../domain/model/maintenance-status';
import { Money } from '../domain/model/money.value-object';
import { MaintenanceApiEndpoint } from './maintenance-api-endpoint';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceManagementApi extends BaseApi {
  readonly #maintenanceEndpoint = new MaintenanceApiEndpoint(this.http);

  getMaintenances(): Observable<Maintenance[]> {
    return this.#maintenanceEndpoint.getAll();
  }

  scheduleMaintenance(maintenance: Maintenance): Observable<Maintenance> {
    return this.#maintenanceEndpoint.create(maintenance);
  }

  startMaintenance(id: number): Observable<Maintenance> {
    return this.#maintenanceEndpoint.changeStatus(id, MaintenanceStatus.InProgress);
  }

  completeMaintenance(id: number, cost: Money): Observable<Maintenance> {
    return this.#maintenanceEndpoint.changeStatus(id, MaintenanceStatus.Completed, cost);
  }

  reportBreakdown(machineryId: number, description: string, severity: BreakdownSeverity): Observable<void> {
    return this.#maintenanceEndpoint.reportBreakdown(machineryId, description, severity);
  }
}
