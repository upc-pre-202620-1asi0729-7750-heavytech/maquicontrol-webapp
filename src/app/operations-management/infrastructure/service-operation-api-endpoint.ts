import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { OperationStatus } from '../domain/model/operation-status';
import { ServiceOperation } from '../domain/model/service-operation.entity';
import { WorkedHoursStatus } from '../domain/model/worked-hours-status';
import { ServiceOperationAssembler } from './service-operation-assembler';
import { ServiceOperationResource, ServiceOperationResponse } from './service-operation-response';

/** A work shift as the platform records it: an ISO date and times with seconds. */
export interface RecordWorkedHoursRequest {
  workDate: string;
  startTime: string;
  endTime: string;
  observations: string | null;
}

export class ServiceOperationApiEndpoint extends BaseApiEndpoint<
  ServiceOperation,
  ServiceOperationResource,
  ServiceOperationResponse,
  ServiceOperationAssembler
> {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/service-operations`, new ServiceOperationAssembler());
  }

  getByRentalId(rentalId: number): Observable<ServiceOperation | null> {
    const params = new HttpParams().set('rentalId', rentalId);

    return this.http.get<ServiceOperationResource[]>(this.endpointUrl, { params }).pipe(
      map((resources) => (resources.length > 0 ? this.assembler.toEntityFromResource(resources[0]) : null)),
      catchError(this.handleError('Failed to fetch the service operation')),
    );
  }

  start(rentalId: number, machineryId: number): Observable<ServiceOperation> {
    return this.#send(this.http.post<ServiceOperationResource>(this.endpointUrl, { rentalId, machineryId }),
      'Failed to start the operation');
  }

  recordWorkedHours(operationId: number, request: RecordWorkedHoursRequest): Observable<ServiceOperation> {
    return this.#send(
      this.http.post<ServiceOperationResource>(`${this.endpointUrl}/${operationId}/worked-hours`, request),
      'Failed to record the worked hours',
    );
  }

  changeWorkedHoursStatus(
    operationId: number,
    workedHoursId: number,
    status: WorkedHoursStatus,
  ): Observable<ServiceOperation> {
    return this.#send(
      this.http.patch<ServiceOperationResource>(
        `${this.endpointUrl}/${operationId}/worked-hours/${workedHoursId}/status`,
        { status },
      ),
      'Failed to validate the worked hours',
    );
  }

  complete(operationId: number): Observable<ServiceOperation> {
    return this.#send(
      this.http.patch<ServiceOperationResource>(`${this.endpointUrl}/${operationId}/status`, {
        status: OperationStatus.Completed,
      }),
      'Failed to complete the operation',
    );
  }

  #send(request: Observable<ServiceOperationResource>, operation: string): Observable<ServiceOperation> {
    return request.pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError(operation)),
    );
  }
}
