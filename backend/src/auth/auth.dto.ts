import { IsString, IsIn } from 'class-validator';
import { Role } from '../auth/roles.decorator';

export class LoginDto {
  @IsString()
  address: string;

  @IsString()
  signature: string;

  @IsIn(['farmer', 'lender', 'vet', 'admin'])
  role: Role;
}
