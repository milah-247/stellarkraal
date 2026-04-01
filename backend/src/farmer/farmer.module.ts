import { Module } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { FarmerController } from './farmer.controller';

@Module({ providers: [FarmerService], controllers: [FarmerController] })
export class FarmerModule {}
