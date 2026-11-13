import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Organization } from '../domain/model/organization.entity';
import { Profile } from '../domain/model/profile.entity';
import { OrganizationAssembler } from './organization-assembler';
import { OrganizationResource } from './organization-response';
import { ProfileAssembler } from './profile-assembler';
import { ProfileResource } from './profile-response';
import { toApiError } from '../../shared/infrastructure/api-error';

export interface ProfileSnapshot {
  profile: Profile;
  organization: Organization | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfilesManagementApi extends BaseApi {
  readonly #profilesUrl = `${environment.apiBaseUrl}/profiles`;
  readonly #organizationsUrl = `${environment.apiBaseUrl}/organizations`;
  readonly #profileAssembler = new ProfileAssembler();
  readonly #organizationAssembler = new OrganizationAssembler();

  /** The signed-in account's profile, or null when the account has not created one yet. */
  getCurrentProfile(): Observable<ProfileSnapshot | null> {
    return this.http.get<ProfileResource>(`${this.#profilesUrl}/me`).pipe(
      map((resource) => this.#toSnapshot(resource)),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of(null) : throwError(() => toApiError(error, 'Failed to load the profile')),
      ),
    );
  }

  createProfile(profile: Profile): Observable<ProfileSnapshot> {
    return this.http
      .post<ProfileResource>(this.#profilesUrl, this.#profileAssembler.toRequestFromEntity(profile))
      .pipe(
        map((resource) => this.#toSnapshot(resource)),
        catchError((error: HttpErrorResponse) => throwError(() => toApiError(error, 'Failed to save the profile'))),
      );
  }

  updateProfile(profile: Profile, id: number): Observable<ProfileSnapshot> {
    return this.http
      .put<ProfileResource>(`${this.#profilesUrl}/${id}`, this.#profileAssembler.toRequestFromEntity(profile))
      .pipe(
        map((resource) => this.#toSnapshot(resource)),
        catchError((error: HttpErrorResponse) => throwError(() => toApiError(error, 'Failed to save the profile'))),
      );
  }

  createOrganization(organization: Organization): Observable<Organization> {
    return this.http
      .post<OrganizationResource>(this.#organizationsUrl, this.#organizationAssembler.toRequestFromEntity(organization))
      .pipe(
        map((resource) => this.#organizationAssembler.toEntityFromResource(resource)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => toApiError(error, 'Failed to save the organization')),
        ),
      );
  }

  updateOrganization(organization: Organization, id: number): Observable<Organization> {
    return this.http
      .put<OrganizationResource>(
        `${this.#organizationsUrl}/${id}`,
        this.#organizationAssembler.toRequestFromEntity(organization),
      )
      .pipe(
        map((resource) => this.#organizationAssembler.toEntityFromResource(resource)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => toApiError(error, 'Failed to save the organization')),
        ),
      );
  }

  #toSnapshot(resource: ProfileResource): ProfileSnapshot {
    return {
      profile: this.#profileAssembler.toEntityFromResource(resource),
      organization: resource.organization
        ? this.#organizationAssembler.toEntityFromResource(resource.organization)
        : null,
    };
  }
}
