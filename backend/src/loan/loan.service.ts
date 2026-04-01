import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowDto, RepayDto } from './loan.dto';

const MAX_LTV_BPS = 6000;
const LIQUIDATION_LTV_BPS = 8000;
const GRACE_PERIOD_SECS = 7 * 24 * 3600;
const APR_BPS = 800;

function simpleInterest(principal: bigint, durationSecs: bigint): bigint {
  const secsPerYear = BigInt(365 * 24 * 3600);
  return (principal * BigInt(APR_BPS) * durationSecs) / (BigInt(10_000) * secsPerYear);
}

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  async borrow(dto: BorrowDto) {
    const farmer = await this.prisma.farmer.findUnique({ where: { address: dto.farmerAddress } });
    if (!farmer) throw new NotFoundException('Farmer not found');

    const animal = await this.prisma.animal.findUnique({ where: { assetId: dto.assetId } });
    if (!animal) throw new NotFoundException('Animal not found');
    if (!animal.verified) throw new BadRequestException('Animal not verified');
    if (animal.deceased) throw new BadRequestException('Animal is deceased');

    const ltv = Math.floor((dto.loanAmount * 10_000) / dto.collateralValue);
    if (ltv > MAX_LTV_BPS) throw new BadRequestException('LTV exceeds 60%');

    const durationSecs = BigInt(dto.durationDays * 24 * 3600);
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));
    const principal = BigInt(dto.loanAmount);
    const interest = simpleInterest(principal, durationSecs);

    const maxLoanId = await this.prisma.loan.aggregate({ _max: { loanId: true } });
    const nextId = (maxLoanId._max.loanId ?? BigInt(0)) + BigInt(1);

    return this.prisma.loan.create({
      data: {
        loanId: nextId,
        farmerId: farmer.id,
        animalId: animal.id,
        principal,
        interestDue: interest,
        collateralValue: BigInt(dto.collateralValue),
        ltvRatio: ltv,
        startTimestamp: nowSecs,
        dueTimestamp: nowSecs + durationSecs,
        kraalId: dto.kraalId,
        status: 'ACTIVE',
      },
    });
  }

  async findById(id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async repay(id: string, dto: RepayDto) {
    const loan = await this.findById(id);
    if (loan.status === 'REPAID') throw new BadRequestException('Loan already repaid');
    if (loan.status === 'LIQUIDATED') throw new BadRequestException('Loan already liquidated');

    const payment = BigInt(dto.amount);
    const interestPayment = payment < loan.interestDue ? payment : loan.interestDue;
    const principalPayment = payment - interestPayment < loan.principal
      ? payment - interestPayment
      : loan.principal;

    const newInterest = loan.interestDue - interestPayment;
    const newPrincipal = loan.principal - principalPayment;
    const status = newInterest === BigInt(0) && newPrincipal === BigInt(0) ? 'REPAID' : 'ACTIVE';

    return this.prisma.loan.update({
      where: { id },
      data: { interestDue: newInterest, principal: newPrincipal, status },
    });
  }

  async getActive() {
    return this.prisma.loan.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  }

  async getLiquidatable() {
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));
    const graceCutoff = nowSecs - BigInt(GRACE_PERIOD_SECS);
    return this.prisma.loan.findMany({
      where: {
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        OR: [
          { dueTimestamp: { lt: graceCutoff } },
          { ltvRatio: { gt: LIQUIDATION_LTV_BPS } },
        ],
      },
    });
  }
}
