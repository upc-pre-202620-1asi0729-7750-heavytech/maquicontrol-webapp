import { Organization } from '../domain/model/organization.entity';
import { OrganizationType } from '../domain/model/organization-type';
import { OrganizationResource, SaveOrganizationRequest } from './organization-response';

export class OrganizationAssembler {
  toEntityFromResource(resource: OrganizationResource): Organization {
    return new Organization({
      id: resource.id,
      legalName: resource.legalName,
      tradeName: resource.tradeName,
      taxId: resource.taxId,
      type: this.toOrganizationType(resource.type),
      address: resource.address ?? '',
    });
  }

  toRequestFromEntity(entity: Organization): SaveOrganizationRequest {
    return {
      legalName: entity.legalName,
      tradeName: entity.tradeName,
      taxId: entity.taxId,
      type: entity.type,
      address: entity.address,
    };
  }

  private toOrganizationType(value: string): OrganizationType {
    if (!Object.values(OrganizationType).includes(value as OrganizationType)) {
      throw new Error(`Unknown organization type: ${value}`);
    }

    return value as OrganizationType;
  }
}
