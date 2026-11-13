import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Payment } from '../domain/model/payment';
import { Plan } from '../domain/model/plan.entity';
import { PlanCode } from '../domain/model/plan-code';
import { Subscription } from '../domain/model/subscription.entity';
import { CheckoutPreferenceRequest, CheckoutPreferenceResource } from './checkout-preference';
import { PaymentApiEndpoint } from './payment-api-endpoint';
import { PlanApiEndpoint } from './plan-api-endpoint';
import { SubscriptionApiEndpoint } from './subscription-api-endpoint';
import { ConfirmCheckoutRequest } from './subscription-response';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionManagementApi extends BaseApi {
  readonly #planEndpoint = new PlanApiEndpoint(this.http);
  readonly #subscriptionEndpoint = new SubscriptionApiEndpoint(this.http);
  readonly #paymentEndpoint = new PaymentApiEndpoint(this.http);

  getPlans(): Observable<Plan[]> {
    return this.#planEndpoint.getAll();
  }

  getMySubscription(): Observable<Subscription | null> {
    return this.#subscriptionEndpoint.getMine();
  }

  getSubscriptionById(id: number): Observable<Subscription> {
    return this.#subscriptionEndpoint.getById(id);
  }

  subscribeToPlan(planCode: PlanCode): Observable<Subscription> {
    return this.#subscriptionEndpoint.subscribeToPlan(planCode);
  }

  confirmCheckout(subscriptionId: number, request: ConfirmCheckoutRequest): Observable<Subscription> {
    return this.#subscriptionEndpoint.confirmCheckout(subscriptionId, request);
  }

  cancelSubscription(subscriptionId: number, reason: string): Observable<Subscription> {
    return this.#subscriptionEndpoint.cancel(subscriptionId, reason);
  }

  createCheckoutPreference(request: CheckoutPreferenceRequest): Observable<CheckoutPreferenceResource> {
    return this.#paymentEndpoint.createCheckoutPreference(request);
  }

  getPayment(paymentId: string): Observable<Payment> {
    return this.#paymentEndpoint.getPayment(paymentId);
  }
}
