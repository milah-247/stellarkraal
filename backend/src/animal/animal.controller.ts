import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnimalService } from './animal.service';
import { RegisterAnimalDto, UpdateHealthDto } from './animal.dto';

@Controller('animals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnimalController {
  constructor(private service: AnimalService) {}

  @Post('register')
  @Roles('farmer', 'admin')
  register(@Body() dto: RegisterAnimalDto) {
    return this.service.register(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/health')
  @Roles('vet', 'admin')
  updateHealth(@Param('id') id: string, @Body() dto: UpdateHealthDto) {
    return this.service.updateHealth(id, dto);
  }

  @Get('kraal/:kraalId')
  byKraal(@Param('kraalId') kraalId: string) {
    return this.service.findByKraal(kraalId);
  }
}
