import type { User, UserProfile } from '../generated/prisma/client';

type UserWithProfile = User & { profile: UserProfile | null };

export interface SafeUserProfile {
  firstName: string;
  middleName: string | null;
  paternalLastName: string;
  maternalLastName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  birthDate: Date | null;
  countryCode: string;
  department: string | null;
  province: string | null;
  district: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  preferredCurrency: string;
  language: string;
}

export interface SafeUser {
  id: string;
  email: string;
  status: User['status'];
  emailVerified: boolean;
  lastLoginAt: Date | null;
  profile: SafeUserProfile | null;
}

export function presentUser(user: UserWithProfile): SafeUser {
  const profile = user.profile;

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    profile: profile
      ? {
          firstName: profile.firstName,
          middleName: profile.middleName,
          paternalLastName: profile.paternalLastName,
          maternalLastName: profile.maternalLastName,
          documentType: profile.documentType,
          documentNumber: profile.documentNumber,
          phone: profile.phone,
          secondaryPhone: profile.secondaryPhone,
          birthDate: profile.birthDate,
          countryCode: profile.countryCode,
          department: profile.department,
          province: profile.province,
          district: profile.district,
          addressLine1: profile.addressLine1,
          addressLine2: profile.addressLine2,
          postalCode: profile.postalCode,
          timezone: profile.timezone,
          preferredCurrency: profile.preferredCurrency,
          language: profile.language,
        }
      : null,
  };
}
