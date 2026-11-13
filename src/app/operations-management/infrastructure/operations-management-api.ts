import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { ServiceOperation } from '../domain/model/service-operation.entity';
import { WorkedHoursStatus } from '../domain/model/worked-hours-status';
import { RecordWorkedHoursRequest, ServiceOperationApiEndpoint } from './service-operation-api-endpoint';

@Injectable({
  providedIn: 'root',
})
export class OperationsManagementApi extends BaseApi {
  readonly #serviceOperationEndpoint = new ServiceOperationApiEndpoint(this.http);

  getServiceOperationByRentalId(rentalId: number): Observable<ServiceOperation | null> {
    return this.#serviceOperationEndpoint.getByRentalId(rentalId);
  }

  startServiceOperation(rentalId: number, machineryId: number): Observable<ServiceOperation> {
    return this.#serviceOperationEndpoint.start(rentalId, machineryId);
  }

  recordWorkedHours(operationId: number, request: RecordWorkedHoursRequest): Observable<ServiceOperation> {
    return this.#serviceOperationEndpoint.recordWorkedHours(operationId, request);
  }

  validateWorkedHours(operationId: number, workedHoursId: number, approve: boolean): Observable<ServiceOperation> {
    return this.#serviceOperationEndpoint.changeWorkedHoursStatus(
      operationId,
      workedHoursId,
      approve ? WorkedHoursStatus.Validated : WorkedHoursStatus.Rejected,
    );
  }

  completeServiceOperation(operationId: number): Observable<ServiceOperation> {
    return this.#serviceOperationEndpoint.complete(operationId);
  }
}
