import { Module, Global } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
