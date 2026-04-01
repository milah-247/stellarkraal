import { SetMetadata } from '@nestjs/common';

export type Role = 'farmer' | 'lender' | 'vet' | 'admin';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
