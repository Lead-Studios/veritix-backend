import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatMapService } from './services/seat-map.service';
import { SeatMapController } from './controllers/seat-map.controller';
import { SeatMap } from './entities/seat-map.entity';
import { Section } from './entities/section.entity';
import { Seat } from './entities/seat.entity';
import { SeatAssignment } from './entities/seat-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SeatMap,
      Section,
      Seat,
      SeatAssignment,
    ]),
  ],
  controllers: [SeatMapController],
  providers: [SeatMapService],
  exports: [SeatMapService],
})
export class SeatMapModule {}
