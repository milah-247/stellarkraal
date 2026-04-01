import { IsString, IsNotEmpty, IsInt, IsPositive, IsIn } from 'class-validator';

export class BorrowDto {
  @IsString() @IsNotEmpty()
  farmerAddress: string;

  @IsString() @IsNotEmpty()
  assetId: string;

  @IsInt() @IsPositive()
  loanAmount: number;

  @IsInt() @IsPositive()
  collateralValue: number;

  @IsString() @IsNotEmpty()
  kraalId: string;

  @IsIn([30, 60, 90])
  durationDays: 30 | 60 | 90;
}

export class RepayDto {
  @IsInt() @IsPositive()
  amount: number;
}
