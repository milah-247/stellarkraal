import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FarmerService } from './farmer.service';
import { RegisterFarmerDto } from './farmer.dto';

@Controller('farmers')
export class FarmerController {
  constructor(private service: FarmerService) {}

  @Post('register')
  register(@Body() dto: RegisterFarmerDto) {
    return this.service.register(dto);
  }

  @Get(':address')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('address') address: string) {
    return this.service.findByAddress(address);
  }

  @Get(':address/loans')
  @UseGuards(AuthGuard('jwt'))
  loans(@Param('address') address: string) {
    return this.service.getLoans(address);
  }

  @Get(':address/animals')
  @UseGuards(AuthGuard('jwt'))
  animals(@Param('address') address: string) {
    return this.service.getAnimals(address);
  }

  @Get('stats')
  stats() {
    return this.service.getStats();
  }
}
