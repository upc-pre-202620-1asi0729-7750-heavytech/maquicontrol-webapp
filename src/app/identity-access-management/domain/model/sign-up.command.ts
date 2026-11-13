import { RoleName } from './role-name';

export class SignUpCommand {
  readonly #email: string;
  readonly #password: string;
  readonly #roleName: RoleName;

  constructor(props: { email: string; password: string; roleName: RoleName }) {
    if (props.email.trim().length === 0 || props.password.length === 0) {
      throw new Error('Email and password are required to sign up.');
    }
    if (!Object.values(RoleName).includes(props.roleName)) {
      throw new Error('A role is required to sign up.');
    }

    this.#email = props.email.trim().toLowerCase();
    this.#password = props.password;
    this.#roleName = props.roleName;
  }

  get email(): string {
    return this.#email;
  }

  get password(): string {
    return this.#password;
  }

  get roleName(): RoleName {
    return this.#roleName;
  }
}
