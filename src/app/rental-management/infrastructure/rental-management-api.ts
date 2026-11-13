import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Rental } from '../domain/model/rental.entity';
import { RentalStatus } from '../domain/model/rental-status';
import { RentalApiEndpoint } from './rental-api-endpoint';

@Injectable({
  providedIn: 'root',
})
export class RentalManagementApi extends BaseApi {
  readonly #rentalEndpoint = new RentalApiEndpoint(this.http);

  getMyReservations(): Observable<Rental[]> {
    return this.#rentalEndpoint.getMyReservations();
  }

  getFleetRentals(): Observable<Rental[]> {
    return this.#rentalEndpoint.getFleetRentals();
  }

  requestRental(rental: Rental): Observable<Rental> {
    return this.#rentalEndpoint.create(rental);
  }

  confirmRental(id: number): Observable<Rental> {
    return this.#rentalEndpoint.changeStatus(id, RentalStatus.Confirmed);
  }

  cancelRental(id: number, reason: string): Observable<Rental> {
    return this.#rentalEndpoint.changeStatus(id, RentalStatus.Cancelled, reason);
  }
}
