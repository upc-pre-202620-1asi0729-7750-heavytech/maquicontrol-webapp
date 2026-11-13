import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionStatus } from '../domain/model/subscription-status';
import { SubscriptionResource, SubscriptionResponse } from './subscription-response';

export class SubscriptionAssembler implements BaseAssembler<
  Subscription,
  SubscriptionResource,
  SubscriptionResponse
> {
  toEntitiesFromResponse(response: SubscriptionResponse): Subscription[] {
    return response.subscriptions.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: SubscriptionResource): Subscription {
    return new Subscription({
      id: resource.id,
      ownerProfileId: resource.ownerProfileId,
      planId: resource.planId,
      status: this.toSubscriptionStatus(resource.status),
      paymentIds: (resource.payments ?? []).map((payment) => payment.providerPaymentId),
      startsAt: resource.startedAt ? new Date(resource.startedAt) : null,
      endsAt: resource.currentPeriodEnd ? new Date(resource.currentPeriodEnd) : null,
    });
  }

  toResourceFromEntity(entity: Subscription): SubscriptionResource {
    return {
      id: entity.id,
      ownerProfileId: entity.ownerProfileId,
      planId: entity.planId,
      status: entity.status,
      startedAt: entity.startsAt?.toISOString() ?? null,
      currentPeriodEnd: entity.endsAt?.toISOString() ?? null,
      cancellationReason: null,
      payments: [],
    };
  }

  private toSubscriptionStatus(value: string): SubscriptionStatus {
    if (!Object.values(SubscriptionStatus).includes(value as SubscriptionStatus)) {
      throw new Error(`Unknown subscription status: ${value}`);
    }

    return value as SubscriptionStatus;
  }
}
