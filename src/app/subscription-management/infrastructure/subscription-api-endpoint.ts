import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { PlanCode } from '../domain/model/plan-code';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionAssembler } from './subscription-assembler';
import { ConfirmCheckoutRequest, SubscriptionResource, SubscriptionResponse } from './subscription-response';

export class SubscriptionApiEndpoint extends BaseApiEndpoint<
  Subscription,
  SubscriptionResource,
  SubscriptionResponse,
  SubscriptionAssembler
> {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/subscriptions`, new SubscriptionAssembler());
  }

  /** The signed-in owner's subscription, or null when they have never subscribed. */
  getMine(): Observable<Subscription | null> {
    return this.http.get<SubscriptionResource>(this.endpointUrl).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of(null) : throwError(() => error),
      ),
      catchError(this.handleError('Failed to fetch the subscription')),
    );
  }

  subscribeToPlan(planCode: PlanCode): Observable<Subscription> {
    return this.http.post<SubscriptionResource>(this.endpointUrl, { planCode }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to subscribe to the plan')),
    );
  }

  confirmCheckout(subscriptionId: number, request: ConfirmCheckoutRequest): Observable<Subscription> {
    return this.http.post<SubscriptionResource>(`${this.endpointUrl}/${subscriptionId}/payments`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to confirm the payment')),
    );
  }

  cancel(subscriptionId: number, reason: string): Observable<Subscription> {
    return this.http
      .patch<SubscriptionResource>(`${this.endpointUrl}/${subscriptionId}/status`, { status: 'CANCELLED', reason })
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource)),
        catchError(this.handleError('Failed to cancel the subscription')),
      );
  }
}
