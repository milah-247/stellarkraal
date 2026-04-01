import { IsString, IsNotEmpty, IsNumber, IsPositive, IsIn, IsOptional } from 'class-validator';

export class RegisterAnimalDto {
  @IsString() @IsNotEmpty()
  assetId: string;

  @IsIn(['CATTLE', 'GOAT', 'SHEEP'])
  species: 'CATTLE' | 'GOAT' | 'SHEEP';

  @IsString() @IsNotEmpty()
  name: string;

  @IsNumber() @IsPositive()
  weightKg: number;

  @IsString() @IsNotEmpty()
  kraalId: string;

  @IsString() @IsNotEmpty()
  farmerId: string;
}

export class UpdateHealthDto {
  @IsIn(['HEALTHY', 'SICK', 'CRITICAL', 'DECEASED'])
  healthStatus: 'HEALTHY' | 'SICK' | 'CRITICAL' | 'DECEASED';

  @IsOptional() @IsString()
  notes?: string;
}
