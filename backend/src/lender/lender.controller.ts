import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LenderService } from './lender.service';
import { DepositDto, WithdrawDto } from './lender.dto';

@Controller('lender')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LenderController {
  constructor(private service: LenderService) {}

  @Post('deposit')
  @Roles('lender')
  deposit(@Body() dto: DepositDto) {
    return this.service.deposit(dto);
  }

  @Post('withdraw')
  @Roles('lender')
  withdraw(@Body() dto: WithdrawDto) {
    return this.service.withdraw(dto);
  }

  @Get(':address/portfolio')
  @Roles('lender', 'admin')
  portfolio(@Param('address') address: string) {
    return this.service.getPortfolio(address);
  }
}
