import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Rental } from '../domain/model/rental.entity';
import { RentalPeriod } from '../domain/model/rental-period.value-object';
import { RentalStatus } from '../domain/model/rental-status';
import { RentalAssembler } from './rental-assembler';
import { RentalResource, RentalResponse } from './rental-response';

export class RentalApiEndpoint extends BaseApiEndpoint<Rental, RentalResource, RentalResponse, RentalAssembler> {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/rentals`, new RentalAssembler());
  }

  getMyReservations(): Observable<Rental[]> {
    return this.#getList('my-reservations', 'Failed to fetch your reservations');
  }

  getFleetRentals(): Observable<Rental[]> {
    return this.#getList('fleet-rentals', 'Failed to fetch the rentals of your fleet');
  }

  override create(entity: Rental): Observable<Rental> {
    return this.http
      .post<RentalResource>(this.endpointUrl, {
        machineryId: entity.machineryId,
        startDate: RentalPeriod.toIsoDate(entity.period.startDate),
        endDate: RentalPeriod.toIsoDate(entity.period.endDate),
      })
      .pipe(
        map((created) => this.assembler.toEntityFromResource(created)),
        catchError(this.handleError('Failed to request the rental')),
      );
  }

  changeStatus(id: number, status: RentalStatus, reason: string | null = null): Observable<Rental> {
    return this.http.patch<RentalResource>(`${this.endpointUrl}/${id}/status`, { status, reason }).pipe(
      map((updated) => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError('Failed to update the reservation')),
    );
  }

  #getList(path: string, operation: string): Observable<Rental[]> {
    return this.http.get<RentalResource[]>(`${this.endpointUrl}/${path}`).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError(operation)),
    );
  }
}
