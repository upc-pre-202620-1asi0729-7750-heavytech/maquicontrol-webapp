import { OrganizationResource } from './organization-response';

export interface ProfileResource {
  id: number;
  userAccountId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  contactInformation: ContactInformationResource | null;
  organization: OrganizationResource | null;
}

export interface ContactInformationResource {
  phoneNumber: string | null;
  secondaryEmail: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
}

export interface SaveProfileRequest {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  contactInformation: ContactInformationResource;
}
