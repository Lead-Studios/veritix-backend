import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class JwtAuthGuard extends AuthGuard('jwt') {}
