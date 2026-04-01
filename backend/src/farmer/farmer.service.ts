import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterFarmerDto } from './farmer.dto';

@Injectable()
export class FarmerService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterFarmerDto) {
    const existing = await this.prisma.farmer.findUnique({ where: { address: dto.address } });
    if (existing) throw new ConflictException('Farmer already registered');
    return this.prisma.farmer.create({ data: dto });
  }

  async findByAddress(address: string) {
    const farmer = await this.prisma.farmer.findUnique({ where: { address } });
    if (!farmer) throw new NotFoundException('Farmer not found');
    return farmer;
  }

  async getLoans(address: string) {
    const farmer = await this.findByAddress(address);
    return this.prisma.loan.findMany({ where: { farmerId: farmer.id }, orderBy: { createdAt: 'desc' } });
  }

  async getAnimals(address: string) {
    const farmer = await this.findByAddress(address);
    return this.prisma.animal.findMany({ where: { farmerId: farmer.id } });
  }
}
