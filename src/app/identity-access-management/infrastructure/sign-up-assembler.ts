import { SignUpCommand } from '../domain/model/sign-up.command';
import { SignUpRequest } from './sign-up.request';
import { SignUpResource, SignUpResponse } from './sign-up-response';

export class SignUpAssembler {
  toRequestFromCommand(command: SignUpCommand): SignUpRequest {
    return {
      email: command.email,
      password: command.password,
      roleName: command.roleName,
    };
  }

  toResourceFromResponse(response: SignUpResponse): SignUpResource {
    return {
      id: response.id,
      email: response.email,
      status: response.status,
      roles: response.roles,
    };
  }
}
