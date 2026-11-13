import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { finalize } from 'rxjs';
import { IdentityAccessStore } from '../../identity-access-management/application/identity-access-store';
import { Organization } from '../domain/model/organization.entity';
import { Profile } from '../domain/model/profile.entity';
import { ProfilesManagementApi, ProfileSnapshot } from '../infrastructure/profiles-management-api';

@Injectable({
  providedIn: 'root',
})
export class ProfilesManagementStore {
  readonly #api = inject(ProfilesManagementApi);
  readonly #identityAccessStore = inject(IdentityAccessStore);

  readonly #currentProfile = signal<Profile | null>(null);
  readonly #currentOrganization = signal<Organization | null>(null);
  readonly #loaded = signal(false);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);
  readonly #saving = signal(false);
  readonly #saveError = signal<string | null>(null);

  readonly currentProfile = this.#currentProfile.asReadonly();
  readonly currentOrganization = this.#currentOrganization.asReadonly();
  /** True once the backend answered whether the signed-in account has a profile. */
  readonly loaded = this.#loaded.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly saveError = this.#saveError.asReadonly();

  readonly profiles = computed(() => {
    const profile = this.#currentProfile();
    return profile ? [profile] : [];
  });
  readonly organizations = computed(() => {
    const organization = this.#currentOrganization();
    return organization ? [organization] : [];
  });
  readonly hasProfile = computed(() => this.#currentProfile() !== null);

  constructor() {
    effect(() => {
      const signedIn = this.#identityAccessStore.isSignedIn();
      untracked(() => (signedIn ? this.loadCurrentProfile() : this.#reset()));
    });
  }

  loadCurrentProfile(): void {
    this.#loading.set(true);
    this.#error.set(null);

    this.#api
      .getCurrentProfile()
      .pipe(finalize(() => this.#loading.set(false)))
      .subscribe({
        next: (snapshot) => {
          this.#apply(snapshot);
          this.#loaded.set(true);
        },
        error: (error: Error) => {
          this.#apply(null);
          this.#error.set(error.message);
        },
      });
  }

  saveProfile(profile: Profile, onSuccess: () => void): void {
    this.#saving.set(true);
    this.#saveError.set(null);

    const existingProfile = this.#currentProfile();
    const request = existingProfile
      ? this.#api.updateProfile(profile, existingProfile.id)
      : this.#api.createProfile(profile);

    request.pipe(finalize(() => this.#saving.set(false))).subscribe({
      next: (snapshot) => {
        this.#apply(snapshot);
        this.#loaded.set(true);
        onSuccess();
      },
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }

  /** The backend links a new organization to the signed-in profile, so no extra profile update is needed. */
  saveOrganization(organization: Organization, onSuccess: () => void): void {
    this.#saving.set(true);
    this.#saveError.set(null);

    const existingOrganization = this.#currentOrganization();
    const request = existingOrganization
      ? this.#api.updateOrganization(organization, existingOrganization.id)
      : this.#api.createOrganization(organization);

    request.pipe(finalize(() => this.#saving.set(false))).subscribe({
      next: (saved) => {
        this.#currentOrganization.set(saved);
        this.loadCurrentProfile();
        onSuccess();
      },
      error: (error: Error) => this.#saveError.set(error.message),
    });
  }

  #apply(snapshot: ProfileSnapshot | null): void {
    this.#currentProfile.set(snapshot?.profile ?? null);
    this.#currentOrganization.set(snapshot?.organization ?? null);
  }

  #reset(): void {
    this.#apply(null);
    this.#loaded.set(false);
    this.#error.set(null);
    this.#saveError.set(null);
  }
}
