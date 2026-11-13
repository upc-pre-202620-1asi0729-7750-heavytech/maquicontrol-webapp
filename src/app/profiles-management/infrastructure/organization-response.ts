export interface OrganizationResource {
  id: number;
  legalName: string;
  tradeName: string | null;
  taxId: string;
  type: string;
  address: string | null;
}

export interface SaveOrganizationRequest {
  legalName: string;
  tradeName: string | null;
  taxId: string;
  type: string;
  address: string;
}
