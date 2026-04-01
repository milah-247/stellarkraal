import { Module } from '@nestjs/common';
import { LenderService } from './lender.service';
import { LenderController } from './lender.controller';

@Module({ providers: [LenderService], controllers: [LenderController] })
export class LenderModule {}
