import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OracleService } from './oracle.service';
import { SetPriceDto, SetHealthDto } from './oracle.dto';

@Controller('oracle')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OracleController {
  constructor(private service: OracleService) {}

  @Post('price')
  @Roles('vet', 'admin')
  setPrice(@Body() dto: SetPriceDto) {
    return this.service.setPrice(dto);
  }

  @Post('health')
  @Roles('vet', 'admin')
  setHealth(@Body() dto: SetHealthDto) {
    return this.service.setHealth(dto);
  }

  @Get('status/:assetId')
  getStatus(@Param('assetId') assetId: string) {
    return this.service.getStatus(assetId);
  }
}
