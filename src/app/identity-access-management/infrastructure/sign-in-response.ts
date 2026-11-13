import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface SignInResponse extends BaseResponse, SignInResource {}

export interface SignInResource extends BaseResource {
  id: number;
  email: string;
  roles: string[];
  token: string;
}
