import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Exchange a signed Stellar challenge for a JWT. */
  @Post('login')
  login(@Body() dto: LoginDto): { token: string } {
    // In production verify the Stellar keypair signature here.
    const token = this.auth.sign({ sub: dto.address, role: dto.role });
    return { token };
  }
}
