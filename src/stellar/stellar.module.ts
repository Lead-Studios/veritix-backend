import { Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [StellarService],
    exports: [StellarService],
})
export class StellarModule { }
