import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { finalize, map, Observable, of, retry, switchMap } from 'rxjs';
import { IdentityAccessStore } from '../../identity-access-management/application/identity-access-store';
import { RoleName } from '../../identity-access-management/domain/model/role-name';
import { Payment } from '../domain/model/payment';
import { PaymentStatus } from '../domain/model/payment-status';
import { Plan } from '../domain/model/plan.entity';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionManagementApi } from '../infrastructure/subscription-management-api';
import { ConfirmCheckoutRequest } from '../infrastructure/subscription-response';

export const CHECKOUT_RESULT_PATH = '/plans/checkout-result';

/** Reason recorded on the backend when an owner replaces an active plan with another one. */
const PLAN_CHANGE_REASON = 'Plan change requested by the owner';

const SUBSCRIBER_ROLES = [RoleName.FleetOwner, RoleName.FleetAdministrator];

export type CheckoutOutcome = 'approved' | 'pending' | 'rejected';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionManagementStore {
  readonly #api = inject(SubscriptionManagementApi);
  readonly #identityAccessStore = inject(IdentityAccessStore);

  readonly #plans = signal<Plan[]>([]);
  readonly #subscription = signal<Subscription | null>(null);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);
  readonly #processing = signal(false);
  readonly #processError = signal<string | null>(null);
  readonly #checkoutOutcome = signal<CheckoutOutcome | null>(null);

  readonly plans = this.#plans.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly processing = this.#processing.asReadonly();
  readonly processError = this.#processError.asReadonly();
  readonly checkoutOutcome = this.#checkoutOutcome.asReadonly();

  readonly currentSubscription = computed(() => {
    const subscription = this.#subscription();
    return subscription?.isActive() ? subscription : null;
  });

  readonly currentPlan = computed(() => {
    const subscription = this.currentSubscription();
    return subscription ? (this.planById(subscription.planId) ?? null) : null;
  });

  constructor() {
    effect(() => {
      const signedIn = this.#identityAccessStore.isSignedIn();
      const subscriber = this.#identityAccessStore.hasAnyRole(SUBSCRIBER_ROLES);
      untracked(() => {
        if (!signedIn) {
          this.#plans.set([]);
          this.#subscription.set(null);
          return;
        }

        this.loadPlans();
        if (subscriber) {
          this.loadSubscription();
        } else {
          this.#subscription.set(null);
        }
      });
    });
  }

  loadPlans(): void {
    this.#loading.set(true);
    this.#error.set(null);

    this.#api
      .getPlans()
      .pipe(
        retry(2),
        finalize(() => this.#loading.set(false)),
      )
      .subscribe({
        next: (plans) => this.#plans.set(plans),
        error: (error: Error) => {
          this.#plans.set([]);
          this.#error.set(error.message);
        },
      });
  }

  loadSubscription(): void {
    this.#api.getMySubscription().subscribe({
      next: (subscription) => this.#subscription.set(subscription),
      error: () => this.#subscription.set(null),
    });
  }

  planById(id: number): Plan | undefined {
    return this.#plans().find((plan) => plan.id === id);
  }

  /**
   * Opens a subscription on the backend (pending payment) and sends the owner to the Mercado Pago checkout.
   * The backend allows one active subscription, so an active plan is cancelled before subscribing to another.
   */
  subscribe(plan: Plan, checkoutTitle: string): void {
    this.#processing.set(true);
    this.#processError.set(null);

    const active = this.currentSubscription();
    const released: Observable<unknown> = active
      ? this.#api.cancelSubscription(active.id, PLAN_CHANGE_REASON)
      : of(null);

    released
      .pipe(
        switchMap(() => this.#api.subscribeToPlan(plan.code)),
        switchMap((created) =>
          this.#api.createCheckoutPreference({
            title: checkoutTitle,
            unitPrice: plan.monthlyPrice.amount,
            currencyId: plan.monthlyPrice.currency,
            externalReference: String(created.id),
            backUrl: `${window.location.origin}${CHECKOUT_RESULT_PATH}`,
          }),
        ),
      )
      .subscribe({
        next: (preference) => window.location.assign(preference.initPoint),
        error: (error: Error) => {
          this.#processing.set(false);
          this.#processError.set(error.message);
          this.loadSubscription();
        },
      });
  }

  /** Reads the Mercado Pago payment and records it on the backend, which activates the subscription when approved. */
  confirmCheckout(paymentId: string | null): void {
    this.#checkoutOutcome.set(null);
    this.#processError.set(null);

    if (!paymentId || paymentId === 'null') {
      this.#checkoutOutcome.set('rejected');
      return;
    }

    this.#processing.set(true);

    this.#api
      .getPayment(paymentId)
      .pipe(
        switchMap((payment) => this.#recordPayment(payment)),
        finalize(() => this.#processing.set(false)),
      )
      .subscribe({
        next: (outcome) => {
          this.#checkoutOutcome.set(outcome);
          this.loadSubscription();
        },
        error: (error: Error) => this.#processError.set(error.message),
      });
  }

  #recordPayment(payment: Payment): Observable<CheckoutOutcome> {
    const subscriptionId = Number(payment.externalReference);
    if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
      throw new Error('The payment does not belong to a MaquiControl subscription.');
    }

    return this.#api.getSubscriptionById(subscriptionId).pipe(
      switchMap((subscription) => {
        if (subscription.hasPayment(payment.id)) {
          return of(subscription);
        }

        const request: ConfirmCheckoutRequest = {
          providerPaymentId: payment.id,
          status: toConfirmStatus(payment.status),
        };
        return this.#api.confirmCheckout(subscription.id, request);
      }),
      map((subscription): CheckoutOutcome => {
        if (subscription.isActive()) {
          return 'approved';
        }

        const pending = payment.status === PaymentStatus.Pending || payment.status === PaymentStatus.InProcess;
        return pending ? 'pending' : 'rejected';
      }),
    );
  }
}

function toConfirmStatus(status: string): ConfirmCheckoutRequest['status'] {
  if (status === PaymentStatus.Approved) {
    return 'APPROVED';
  }

  return status === PaymentStatus.Pending || status === PaymentStatus.InProcess ? 'PENDING' : 'REJECTED';
}
