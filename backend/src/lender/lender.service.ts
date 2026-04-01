import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto, WithdrawDto } from './lender.dto';

@Injectable()
export class LenderService {
  constructor(private prisma: PrismaService) {}

  async deposit(dto: DepositDto) {
    const amount = BigInt(dto.usdcAmount);
    return this.prisma.lenderPosition.upsert({
      where: { address: dto.address },
      create: { address: dto.address, balance: amount },
      update: { balance: { increment: amount } },
    });
  }

  async withdraw(dto: WithdrawDto) {
    const position = await this.prisma.lenderPosition.findUnique({ where: { address: dto.address } });
    if (!position) throw new NotFoundException('Lender position not found');
    const amount = BigInt(dto.usdcAmount);
    if (position.balance < amount) throw new BadRequestException('Insufficient balance');
    return this.prisma.lenderPosition.update({
      where: { address: dto.address },
      data: { balance: { decrement: amount } },
    });
  }

  async getPortfolio(address: string) {
    const position = await this.prisma.lenderPosition.findUnique({ where: { address } });
    if (!position) throw new NotFoundException('Lender position not found');

    const totalBorrowedAgg = await this.prisma.loan.aggregate({
      _sum: { principal: true },
      where: { status: 'ACTIVE' },
    });
    const totalDepositedAgg = await this.prisma.lenderPosition.aggregate({ _sum: { balance: true } });

    const totalBorrowed = totalBorrowedAgg._sum.principal ?? BigInt(0);
    const totalDeposited = totalDepositedAgg._sum.balance ?? BigInt(1);
    const utilizationRate = Number((totalBorrowed * BigInt(10_000)) / totalDeposited);

    return { position, utilizationRate, lenderApy: 600 };
  }
}
