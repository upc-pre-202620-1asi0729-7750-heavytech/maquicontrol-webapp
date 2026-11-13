import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface PlanResponse extends BaseResponse {
  plans: PlanResource[];
}

export interface PlanResource extends BaseResource {
  id: number;
  code: string;
  name: string;
  machineryLimit: number;
  priceAmount: number;
  priceCurrency: string;
  billingCycle: string;
}
