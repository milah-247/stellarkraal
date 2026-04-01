import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class DepositDto {
  @IsString() @IsNotEmpty()
  address: string;

  @IsInt() @IsPositive()
  usdcAmount: number;
}

export class WithdrawDto {
  @IsString() @IsNotEmpty()
  address: string;

  @IsInt() @IsPositive()
  usdcAmount: number;
}
