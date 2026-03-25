import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets-inventory/entities/ticket.entity';
import { Order } from '../orders/orders.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Event, Ticket, Order, AdminAuditLog]),
  ],
  providers: [AdminService, AuditLogService],
  controllers: [AdminController],
  exports: [AuditLogService],
})
export class AdminModule {}
