import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { SubscriptionStatus } from './subscription-status';

export class Subscription implements BaseEntity {
  readonly #id: number;
  readonly #ownerProfileId: number;
  readonly #planId: number;
  readonly #status: SubscriptionStatus;
  readonly #paymentIds: string[];
  readonly #startsAt: Date | null;
  readonly #endsAt: Date | null;

  constructor(props: {
    id: number;
    ownerProfileId: number;
    planId: number;
    status: SubscriptionStatus;
    paymentIds: string[];
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    if (props.id <= 0 || props.ownerProfileId <= 0 || props.planId <= 0) {
      throw new Error('Subscription identifiers must be positive numbers.');
    }

    this.#id = props.id;
    this.#ownerProfileId = props.ownerProfileId;
    this.#planId = props.planId;
    this.#status = props.status;
    this.#paymentIds = [...props.paymentIds];
    this.#startsAt = props.startsAt;
    this.#endsAt = props.endsAt;
  }

  get id(): number {
    return this.#id;
  }

  get ownerProfileId(): number {
    return this.#ownerProfileId;
  }

  get planId(): number {
    return this.#planId;
  }

  get status(): SubscriptionStatus {
    return this.#status;
  }

  get paymentIds(): readonly string[] {
    return this.#paymentIds;
  }

  get startsAt(): Date | null {
    return this.#startsAt;
  }

  get endsAt(): Date | null {
    return this.#endsAt;
  }

  isActive(): boolean {
    return this.#status === SubscriptionStatus.Active;
  }

  isPendingPayment(): boolean {
    return this.#status === SubscriptionStatus.PendingPayment;
  }

  hasPayment(providerPaymentId: string): boolean {
    return this.#paymentIds.includes(providerPaymentId);
  }
}
