import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Ticket]), AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
