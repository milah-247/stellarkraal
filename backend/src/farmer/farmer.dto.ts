import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RegisterFarmerDto {
  @IsString() @IsNotEmpty()
  address: string;

  @IsString() @IsNotEmpty() @Length(2, 80)
  name: string;

  @IsString() @IsNotEmpty()
  region: string;
}
