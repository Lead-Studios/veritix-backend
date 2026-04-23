import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTypesController } from './ticket-types.controller';
import { TicketTypesService } from './ticket-types.service';
import { TicketType } from './entities/ticket-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketType])],
  controllers: [TicketTypesController],
  providers: [TicketTypesService],
  exports: [TicketTypesService],
})
export class TicketTypesModule {}
