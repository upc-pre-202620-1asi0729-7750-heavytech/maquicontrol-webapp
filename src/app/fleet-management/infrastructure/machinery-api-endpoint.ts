import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Machinery } from '../domain/model/machinery.entity';
import { MachineryStatus } from '../domain/model/machinery-status';
import { MachineryAssembler } from './machinery-assembler';
import { MachineryResource, MachineryResponse } from './machinery-response';

export class MachineryApiEndpoint extends BaseApiEndpoint<
  Machinery,
  MachineryResource,
  MachineryResponse,
  MachineryAssembler
> {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/machinery`, new MachineryAssembler());
  }

  /** The backend assigns the identifier, the owner and the initial AVAILABLE status. */
  override create(entity: Machinery): Observable<Machinery> {
    return this.http.post<MachineryResource>(this.endpointUrl, this.assembler.toRequestFromEntity(entity)).pipe(
      map((created) => this.assembler.toEntityFromResource(created)),
      catchError(this.handleError('Failed to register the machinery')),
    );
  }

  override update(entity: Machinery, id: number): Observable<Machinery> {
    return this.http
      .put<MachineryResource>(`${this.endpointUrl}/${id}`, this.assembler.toRequestFromEntity(entity))
      .pipe(
        map((updated) => this.assembler.toEntityFromResource(updated)),
        catchError(this.handleError('Failed to update the machinery')),
      );
  }

  changeStatus(id: number, status: MachineryStatus): Observable<Machinery> {
    return this.http.patch<MachineryResource>(`${this.endpointUrl}/${id}/status`, { status }).pipe(
      map((updated) => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError('Failed to change the machinery status')),
    );
  }
}
