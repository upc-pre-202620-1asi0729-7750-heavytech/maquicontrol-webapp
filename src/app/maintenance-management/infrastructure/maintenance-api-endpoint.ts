import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BreakdownSeverity } from '../domain/model/breakdown-severity';
import { Maintenance } from '../domain/model/maintenance.entity';
import { MaintenanceStatus } from '../domain/model/maintenance-status';
import { Money } from '../domain/model/money.value-object';
import { MaintenanceAssembler } from './maintenance-assembler';
import { MaintenanceResource, MaintenanceResponse } from './maintenance-response';

export class MaintenanceApiEndpoint extends BaseApiEndpoint<
  Maintenance,
  MaintenanceResource,
  MaintenanceResponse,
  MaintenanceAssembler
> {
  readonly #breakdownReportsUrl = `${environment.apiBaseUrl}/breakdown-reports`;

  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/maintenances`, new MaintenanceAssembler());
  }

  override create(entity: Maintenance): Observable<Maintenance> {
    return this.http
      .post<MaintenanceResource>(this.endpointUrl, {
        machineryId: entity.machineryId,
        type: entity.type,
        description: entity.description,
        scheduledDate: MaintenanceAssembler.toLocalDateTime(entity.scheduledDate),
        technicianName: entity.technicianName,
      })
      .pipe(
        map((created) => this.assembler.toEntityFromResource(created)),
        catchError(this.handleError('Failed to schedule the maintenance')),
      );
  }

  changeStatus(id: number, status: MaintenanceStatus, cost: Money | null = null): Observable<Maintenance> {
    const body = { status, cost: cost ? { amount: cost.amount, currency: cost.currency } : null };

    return this.http.patch<MaintenanceResource>(`${this.endpointUrl}/${id}/status`, body).pipe(
      map((updated) => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError('Failed to update the maintenance')),
    );
  }

  reportBreakdown(machineryId: number, description: string, severity: BreakdownSeverity): Observable<void> {
    return this.http
      .post<void>(this.#breakdownReportsUrl, { machineryId, description, severity })
      .pipe(
        map(() => undefined),
        catchError(this.handleError('Failed to report the breakdown')),
      );
  }
}
