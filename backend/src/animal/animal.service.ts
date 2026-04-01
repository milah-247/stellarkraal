import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterAnimalDto, UpdateHealthDto } from './animal.dto';

@Injectable()
export class AnimalService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterAnimalDto) {
    return this.prisma.animal.create({ data: dto });
  }

  async findById(id: string) {
    const animal = await this.prisma.animal.findUnique({ where: { id } });
    if (!animal) throw new NotFoundException('Animal not found');
    return animal;
  }

  async updateHealth(id: string, dto: UpdateHealthDto) {
    await this.findById(id);
    return this.prisma.animal.update({
      where: { id },
      data: {
        healthStatus: dto.healthStatus,
        deceased: dto.healthStatus === 'DECEASED',
      },
    });
  }

  async findByKraal(kraalId: string) {
    return this.prisma.animal.findMany({ where: { kraalId } });
  }
}
