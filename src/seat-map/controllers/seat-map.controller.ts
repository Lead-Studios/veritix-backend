import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeatMapService } from '../services/seat-map.service';
import { CreateSeatMapDto } from '../dto/create-seat-map.dto';
import { UpdateSeatMapDto } from '../dto/update-seat-map.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { AssignSeatDto, HoldSeatDto, ReleaseSeatDto, TransferSeatDto } from '../dto/assign-seat.dto';
import { SeatQueryDto, SectionQueryDto } from '../dto/seat-query.dto';
import { SeatMapResponseDto, SectionResponseDto, SeatResponseDto } from '../dto/seat-map-response.dto';

@Controller('seat-maps')
export class SeatMapController {
  constructor(private readonly seatMapService: SeatMapService) {}

  // Seat Map endpoints
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSeatMap(@Body() createSeatMapDto: CreateSeatMapDto): Promise<SeatMapResponseDto> {
    return this.seatMapService.createSeatMap(createSeatMapDto);
  }

  @Get()
  async findAllSeatMaps(): Promise<SeatMapResponseDto[]> {
    return this.seatMapService.findAllSeatMaps();
  }

  @Get('event/:eventId')
  async findSeatMapsByEventId(@Param('eventId') eventId: string): Promise<SeatMapResponseDto[]> {
    return this.seatMapService.findSeatMapsByEventId(eventId);
  }

  @Get(':id')
  async findSeatMapById(@Param('id') id: string): Promise<SeatMapResponseDto> {
    return this.seatMapService.findSeatMapById(id);
  }

  @Patch(':id')
  async updateSeatMap(
    @Param('id') id: string,
    @Body() updateSeatMapDto: UpdateSeatMapDto,
  ): Promise<SeatMapResponseDto> {
    return this.seatMapService.updateSeatMap(id, updateSeatMapDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSeatMap(@Param('id') id: string): Promise<void> {
    return this.seatMapService.deleteSeatMap(id);
  }

  // Section endpoints
  @Post('sections')
  @HttpCode(HttpStatus.CREATED)
  async createSection(@Body() createSectionDto: CreateSectionDto): Promise<SectionResponseDto> {
    return this.seatMapService.createSection(createSectionDto);
  }

  @Get(':seatMapId/sections')
  async findSectionsBySeatMapId(
    @Param('seatMapId') seatMapId: string,
    @Query() query: SectionQueryDto,
  ): Promise<SectionResponseDto[]> {
    return this.seatMapService.findSectionsBySeatMapId(seatMapId, query);
  }

  @Get('sections/:id')
  async findSectionById(@Param('id') id: string): Promise<SectionResponseDto> {
    return this.seatMapService.findSectionById(id);
  }

  // Seat endpoints
  @Get('sections/:sectionId/seats')
  async findSeatsBySectionId(
    @Param('sectionId') sectionId: string,
    @Query() query: SeatQueryDto,
  ): Promise<SeatResponseDto[]> {
    return this.seatMapService.findSeatsBySectionId(sectionId, query);
  }

  // Seat assignment endpoints
  @Post('seats/assign')
  @HttpCode(HttpStatus.OK)
  async assignSeat(@Body() assignSeatDto: AssignSeatDto): Promise<SeatResponseDto> {
    return this.seatMapService.assignSeat(assignSeatDto);
  }

  @Post('seats/hold')
  @HttpCode(HttpStatus.OK)
  async holdSeat(@Body() holdSeatDto: HoldSeatDto): Promise<SeatResponseDto> {
    return this.seatMapService.holdSeat(holdSeatDto);
  }

  @Post('seats/release')
  @HttpCode(HttpStatus.OK)
  async releaseSeat(@Body() releaseSeatDto: ReleaseSeatDto): Promise<SeatResponseDto> {
    return this.seatMapService.releaseSeat(releaseSeatDto);
  }

  @Post('seats/transfer')
  @HttpCode(HttpStatus.OK)
  async transferSeat(@Body() transferSeatDto: TransferSeatDto): Promise<SeatResponseDto> {
    return this.seatMapService.transferSeat(transferSeatDto);
  }

  // Utility endpoints
  @Post('maintenance/release-expired-holds')
  @HttpCode(HttpStatus.OK)
  async releaseExpiredHolds(): Promise<{ releasedCount: number }> {
    const releasedCount = await this.seatMapService.releaseExpiredHolds();
    return { releasedCount };
  }
}
