import { IsString, IsNotEmpty, IsInt, IsPositive, IsIn } from 'class-validator';

export class SetPriceDto {
  @IsString() @IsNotEmpty()
  assetId: string;

  @IsInt() @IsPositive()
  price: number;
}

export class SetHealthDto {
  @IsString() @IsNotEmpty()
  assetId: string;

  @IsIn(['HEALTHY', 'SICK', 'CRITICAL', 'DECEASED'])
  healthStatus: 'HEALTHY' | 'SICK' | 'CRITICAL' | 'DECEASED';
}
