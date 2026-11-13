import { ContactInformation } from '../domain/model/contact-information.value-object';
import { DocumentType } from '../domain/model/document-type';
import { Profile } from '../domain/model/profile.entity';
import { ProfileResource, SaveProfileRequest } from './profile-response';

export class ProfileAssembler {
  toEntityFromResource(resource: ProfileResource): Profile {
    const contact = resource.contactInformation;

    return new Profile({
      id: resource.id,
      userAccountId: resource.userAccountId,
      organizationId: resource.organization?.id ?? null,
      firstName: resource.firstName,
      lastName: resource.lastName,
      documentType: this.toDocumentType(resource.documentType),
      documentNumber: resource.documentNumber,
      contactInformation: new ContactInformation({
        phoneNumber: contact?.phoneNumber ?? '-',
        secondaryEmail: contact?.secondaryEmail ?? null,
        address: contact?.address ?? '-',
        district: contact?.district ?? '-',
        city: contact?.city ?? '-',
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  toRequestFromEntity(entity: Profile): SaveProfileRequest {
    return {
      firstName: entity.firstName,
      lastName: entity.lastName,
      documentType: entity.documentType,
      documentNumber: entity.documentNumber,
      contactInformation: {
        phoneNumber: entity.contactInformation.phoneNumber,
        secondaryEmail: entity.contactInformation.secondaryEmail,
        address: entity.contactInformation.address,
        district: entity.contactInformation.district,
        city: entity.contactInformation.city,
      },
    };
  }

  private toDocumentType(value: string): DocumentType {
    if (!Object.values(DocumentType).includes(value as DocumentType)) {
      throw new Error(`Unknown document type: ${value}`);
    }

    return value as DocumentType;
  }
}
