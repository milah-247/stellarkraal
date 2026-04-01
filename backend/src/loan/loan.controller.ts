import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LoanService } from './loan.service';
import { BorrowDto, RepayDto } from './loan.dto';

@Controller('loans')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LoanController {
  constructor(private service: LoanService) {}

  @Post('borrow')
  @Roles('farmer')
  borrow(@Body() dto: BorrowDto) {
    return this.service.borrow(dto);
  }

  @Get('active')
  @Roles('admin', 'lender')
  active() {
    return this.service.getActive();
  }

  @Get('liquidatable')
  @Roles('admin', 'lender')
  liquidatable() {
    return this.service.getLiquidatable();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/repay')
  @Roles('farmer')
  repay(@Param('id') id: string, @Body() dto: RepayDto) {
    return this.service.repay(id, dto);
  }
}
