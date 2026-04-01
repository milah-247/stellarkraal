import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetPriceDto, SetHealthDto } from './oracle.dto';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

@Injectable()
export class OracleService {
  constructor(private prisma: PrismaService) {}

  async setPrice(dto: SetPriceDto) {
    return this.prisma.oraclePrice.upsert({
      where: { assetId: dto.assetId },
      create: { assetId: dto.assetId, price: BigInt(dto.price) },
      update: { price: BigInt(dto.price) },
    });
  }

  async setHealth(dto: SetHealthDto) {
    const animal = await this.prisma.animal.findUnique({ where: { assetId: dto.assetId } });
    if (!animal) throw new NotFoundException('Animal not found');
    return this.prisma.animal.update({
      where: { assetId: dto.assetId },
      data: {
        healthStatus: dto.healthStatus,
        deceased: dto.healthStatus === 'DECEASED',
      },
    });
  }

  async getStatus(assetId: string) {
    const price = await this.prisma.oraclePrice.findUnique({ where: { assetId } });
    if (!price) throw new NotFoundException('No oracle data for asset');
    const stale = Date.now() - price.updatedAt.getTime() > STALE_THRESHOLD_MS;
    return { assetId, price: price.price.toString(), updatedAt: price.updatedAt, stale };
  }
}
