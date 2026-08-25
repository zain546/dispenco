import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getHealth(): { status: string } {
    return { status: 'AuthModule active' };
  }
}
