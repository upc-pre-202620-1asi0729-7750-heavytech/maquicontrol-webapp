import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface SubscriptionResponse extends BaseResponse {
  subscriptions: SubscriptionResource[];
}

export interface SubscriptionPaymentResource {
  id: number;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
}

export interface SubscriptionResource extends BaseResource {
  id: number;
  ownerProfileId: number;
  planId: number;
  status: string;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancellationReason: string | null;
  payments: SubscriptionPaymentResource[];
}

/** Body of POST /subscriptions/{id}/payments, sent once Mercado Pago returns to the app. */
export interface ConfirmCheckoutRequest {
  providerPaymentId: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}
