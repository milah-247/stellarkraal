import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { FarmerModule } from './farmer/farmer.module';
import { AnimalModule } from './animal/animal.module';
import { LoanModule } from './loan/loan.module';
import { LenderModule } from './lender/lender.module';
import { OracleModule } from './oracle/oracle.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FarmerModule,
    AnimalModule,
    LoanModule,
    LenderModule,
    OracleModule,
  ],
  providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) }],
})
export class AppModule {}
