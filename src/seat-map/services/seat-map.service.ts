import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { SeatMap } from '../entities/seat-map.entity';
import { Section } from '../entities/section.entity';
import { Seat, SeatStatus } from '../entities/seat.entity';
import { SeatAssignment, AssignmentStatus } from '../entities/seat-assignment.entity';
import { CreateSeatMapDto } from '../dto/create-seat-map.dto';
import { UpdateSeatMapDto } from '../dto/update-seat-map.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { AssignSeatDto, HoldSeatDto, ReleaseSeatDto, TransferSeatDto } from '../dto/assign-seat.dto';
import { SeatQueryDto, SectionQueryDto } from '../dto/seat-query.dto';
import { SeatMapResponseDto, SectionResponseDto, SeatResponseDto } from '../dto/seat-map-response.dto';

@Injectable()
export class SeatMapService {
  constructor(
    @InjectRepository(SeatMap)
    private readonly seatMapRepository: Repository<SeatMap>,
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(SeatAssignment)
    private readonly seatAssignmentRepository: Repository<SeatAssignment>,
  ) {}

  async createSeatMap(createSeatMapDto: CreateSeatMapDto): Promise<SeatMapResponseDto> {
    const seatMap = this.seatMapRepository.create(createSeatMapDto);
    const savedSeatMap = await this.seatMapRepository.save(seatMap);
    return this.transformSeatMapToResponse(savedSeatMap);
  }

  async findAllSeatMaps(): Promise<SeatMapResponseDto[]> {
    const seatMaps = await this.seatMapRepository.find({
      relations: ['sections', 'sections.seats', 'sections.seats.assignment'],
    });
    return seatMaps.map(seatMap => this.transformSeatMapToResponse(seatMap));
  }

  async findSeatMapById(id: string): Promise<SeatMapResponseDto> {
    const seatMap = await this.seatMapRepository.findOne({
      where: { id },
      relations: ['sections', 'sections.seats', 'sections.seats.assignment'],
    });

    if (!seatMap) {
      throw new NotFoundException(`Seat map with ID ${id} not found`);
    }

    return this.transformSeatMapToResponse(seatMap);
  }

  async findSeatMapsByEventId(eventId: string): Promise<SeatMapResponseDto[]> {
    const seatMaps = await this.seatMapRepository.find({
      where: { eventId },
      relations: ['sections', 'sections.seats', 'sections.seats.assignment'],
    });
    return seatMaps.map(seatMap => this.transformSeatMapToResponse(seatMap));
  }

  async updateSeatMap(id: string, updateSeatMapDto: UpdateSeatMapDto): Promise<SeatMapResponseDto> {
    const seatMap = await this.findSeatMapEntityById(id);
    Object.assign(seatMap, updateSeatMapDto);
    const updatedSeatMap = await this.seatMapRepository.save(seatMap);
    return this.transformSeatMapToResponse(updatedSeatMap);
  }

  async deleteSeatMap(id: string): Promise<void> {
    const result = await this.seatMapRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Seat map with ID ${id} not found`);
    }
  }

  // Section methods
  async createSection(createSectionDto: CreateSectionDto): Promise<SectionResponseDto> {
    // Verify seat map exists
    await this.findSeatMapEntityById(createSectionDto.seatMapId);

    const section = this.sectionRepository.create(createSectionDto);
    const savedSection = await this.sectionRepository.save(section);

    // Auto-generate seats if seatLayout is provided
    if (createSectionDto.seatLayout) {
      await this.generateSeatsForSection(savedSection.id, createSectionDto.seatLayout);
    }

    return this.findSectionById(savedSection.id);
  }

  async findSectionById(id: string): Promise<SectionResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['seats', 'seats.assignment'],
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return this.transformSectionToResponse(section);
  }

  async findSectionsBySeatMapId(seatMapId: string, query?: SectionQueryDto): Promise<SectionResponseDto[]> {
    const findOptions: FindManyOptions<Section> = {
      where: { seatMapId },
      relations: query?.includeSeats ? ['seats', 'seats.assignment'] : [],
    };

    if (query?.type) {
      findOptions.where = { ...findOptions.where, type: query.type };
    }

    if (query?.isActive !== undefined) {
      findOptions.where = { ...findOptions.where, isActive: query.isActive };
    }

    const sections = await this.sectionRepository.find(findOptions);
    return sections.map(section => this.transformSectionToResponse(section));
  }

  // Seat methods
  async findSeatsBySectionId(sectionId: string, query?: SeatQueryDto): Promise<SeatResponseDto[]> {
    const findOptions: FindManyOptions<Seat> = {
      where: { sectionId },
      relations: ['assignment'],
    };

    if (query?.status) {
      findOptions.where = { ...findOptions.where, status: query.status };
    }

    if (query?.type) {
      findOptions.where = { ...findOptions.where, type: query.type };
    }

    if (query?.row) {
      findOptions.where = { ...findOptions.where, row: query.row };
    }

    if (query?.isActive !== undefined) {
      findOptions.where = { ...findOptions.where, isActive: query.isActive };
    }

    const seats = await this.seatRepository.find(findOptions);

    // Filter by price range if specified
    let filteredSeats = seats;
    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      filteredSeats = seats.filter(seat => {
        const price = seat.price || 0;
        if (query.minPrice !== undefined && price < query.minPrice) return false;
        if (query.maxPrice !== undefined && price > query.maxPrice) return false;
        return true;
      });
    }

    return filteredSeats.map(seat => this.transformSeatToResponse(seat));
  }

  async assignSeat(assignSeatDto: AssignSeatDto): Promise<SeatResponseDto> {
    const seat = await this.findSeatEntityById(assignSeatDto.seatId);

    // Check if seat is available
    if (seat.status !== SeatStatus.AVAILABLE && seat.status !== SeatStatus.HELD) {
      throw new ConflictException(`Seat ${seat.label} is not available for assignment`);
    }

    // Check if seat is held by someone else
    if (seat.status === SeatStatus.HELD && seat.holdReference) {
      // Allow assignment if it's the same hold reference or hold has expired
      const now = new Date();
      if (seat.heldUntil && seat.heldUntil > now) {
        throw new ConflictException(`Seat ${seat.label} is currently held until ${seat.heldUntil}`);
      }
    }

    // Create seat assignment
    const assignment = this.seatAssignmentRepository.create({
      seatId: assignSeatDto.seatId,
      userId: assignSeatDto.userId,
      ticketId: assignSeatDto.ticketId,
      assignedPrice: assignSeatDto.assignedPrice,
      purchaseReference: assignSeatDto.purchaseReference,
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
    });

    await this.seatAssignmentRepository.save(assignment);

    // Update seat status
    seat.status = SeatStatus.SOLD;
    seat.heldUntil = undefined;
    seat.holdReference = undefined;
    await this.seatRepository.save(seat);

    return this.findSeatById(assignSeatDto.seatId);
  }

  async holdSeat(holdSeatDto: HoldSeatDto): Promise<SeatResponseDto> {
    const seat = await this.findSeatEntityById(holdSeatDto.seatId);

    if (seat.status !== SeatStatus.AVAILABLE) {
      throw new ConflictException(`Seat ${seat.label} is not available for holding`);
    }

    const heldUntil = holdSeatDto.heldUntil 
      ? new Date(holdSeatDto.heldUntil)
      : new Date(Date.now() + 15 * 60 * 1000); // Default 15 minutes

    seat.status = SeatStatus.HELD;
    seat.heldUntil = heldUntil;
    seat.holdReference = holdSeatDto.holdReference;

    await this.seatRepository.save(seat);
    return this.findSeatById(holdSeatDto.seatId);
  }

  async releaseSeat(releaseSeatDto: ReleaseSeatDto): Promise<SeatResponseDto> {
    const seat = await this.findSeatEntityById(releaseSeatDto.seatId);

    if (seat.status === SeatStatus.HELD) {
      // Verify hold reference if provided
      if (releaseSeatDto.holdReference && seat.holdReference !== releaseSeatDto.holdReference) {
        throw new BadRequestException('Invalid hold reference');
      }

      seat.status = SeatStatus.AVAILABLE;
      seat.heldUntil = undefined;
      seat.holdReference = undefined;
      await this.seatRepository.save(seat);
    }

    return this.findSeatById(releaseSeatDto.seatId);
  }

  async transferSeat(transferSeatDto: TransferSeatDto): Promise<SeatResponseDto> {
    const seat = await this.findSeatEntityById(transferSeatDto.seatId);

    if (seat.status !== SeatStatus.SOLD) {
      throw new ConflictException(`Seat ${seat.label} is not sold and cannot be transferred`);
    }

    const assignment = await this.seatAssignmentRepository.findOne({
      where: { seatId: transferSeatDto.seatId, status: AssignmentStatus.ASSIGNED },
    });

    if (!assignment) {
      throw new NotFoundException('No active assignment found for this seat');
    }

    if (assignment.userId !== transferSeatDto.fromUserId) {
      throw new BadRequestException('Transfer can only be initiated by the current seat owner');
    }

    // Update assignment
    assignment.status = AssignmentStatus.TRANSFERRED;
    assignment.transferredAt = new Date();
    assignment.transferredFromUserId = transferSeatDto.fromUserId;
    assignment.transferReference = transferSeatDto.transferReference;
    await this.seatAssignmentRepository.save(assignment);

    // Create new assignment
    const newAssignment = this.seatAssignmentRepository.create({
      seatId: transferSeatDto.seatId,
      userId: transferSeatDto.toUserId,
      ticketId: assignment.ticketId,
      assignedPrice: assignment.assignedPrice,
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      transferReference: transferSeatDto.transferReference,
    });

    await this.seatAssignmentRepository.save(newAssignment);
    return this.findSeatById(transferSeatDto.seatId);
  }

  async releaseExpiredHolds(): Promise<number> {
    const now = new Date();
    const expiredSeats = await this.seatRepository.find({
      where: {
        status: SeatStatus.HELD,
        heldUntil: Or(IsNull(), LessThanOrEqual(now)),
      },
    });

    if (expiredSeats.length > 0) {
      for (const seat of expiredSeats) {
        seat.status = SeatStatus.AVAILABLE;
        seat.heldUntil = undefined;
        seat.holdReference = undefined;
      }
      await this.seatRepository.save(expiredSeats);
    }

    return expiredSeats.length;
  }

  // Helper methods
  private async findSeatMapEntityById(id: string): Promise<SeatMap> {
    const seatMap = await this.seatMapRepository.findOne({ where: { id } });
    if (!seatMap) {
      throw new NotFoundException(`Seat map with ID ${id} not found`);
    }
    return seatMap;
  }

  private async findSeatEntityById(id: string): Promise<Seat> {
    const seat = await this.seatRepository.findOne({ 
      where: { id },
      relations: ['assignment']
    });
    if (!seat) {
      throw new NotFoundException(`Seat with ID ${id} not found`);
    }
    return seat;
  }

  private async findSeatById(id: string): Promise<SeatResponseDto> {
    const seat = await this.seatRepository.findOne({
      where: { id },
      relations: ['assignment'],
    });

    if (!seat) {
      throw new NotFoundException(`Seat with ID ${id} not found`);
    }

    return this.transformSeatToResponse(seat);
  }

  private async generateSeatsForSection(sectionId: string, seatLayout: any): Promise<void> {
    const seats: Seat[] = [];
    const { rows, seatsPerRow, rowLabels } = seatLayout;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel = rowLabels?.[rowIndex] || String.fromCharCode(65 + rowIndex); // A, B, C...

      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
        const seat = this.seatRepository.create({
          sectionId,
          row: rowLabel,
          number: seatNumber.toString(),
          label: `${rowLabel}-${seatNumber}`,
          status: SeatStatus.AVAILABLE,
          position: {
            x: seatNumber * 30, // Basic positioning
            y: rowIndex * 30,
          },
        });
        seats.push(seat);
      }
    }

    await this.seatRepository.save(seats);
  }

  private transformSeatMapToResponse(seatMap: SeatMap): SeatMapResponseDto {
    const sections = seatMap.sections?.map(section => this.transformSectionToResponse(section)) || [];
    
    const totalAvailableSeats = sections.reduce((sum, section) => sum + section.availableSeats, 0);
    const totalSoldSeats = sections.reduce((sum, section) => sum + section.soldSeats, 0);
    const totalHeldSeats = sections.reduce((sum, section) => sum + section.heldSeats, 0);

    return {
      id: seatMap.id,
      name: seatMap.name,
      description: seatMap.description,
      venueName: seatMap.venueName,
      totalCapacity: seatMap.totalCapacity,
      layout: seatMap.layout,
      isActive: seatMap.isActive,
      eventId: seatMap.eventId,
      sections,
      totalAvailableSeats,
      totalSoldSeats,
      totalHeldSeats,
      createdAt: seatMap.createdAt,
      updatedAt: seatMap.updatedAt,
    };
  }

  private transformSectionToResponse(section: Section): SectionResponseDto {
    const seats = section.seats?.map(seat => this.transformSeatToResponse(seat)) || [];
    
    const availableSeats = seats.filter(seat => seat.status === SeatStatus.AVAILABLE).length;
    const soldSeats = seats.filter(seat => seat.status === SeatStatus.SOLD).length;
    const heldSeats = seats.filter(seat => seat.status === SeatStatus.HELD).length;

    return {
      id: section.id,
      name: section.name,
      type: section.type,
      basePrice: section.basePrice,
      color: section.color,
      capacity: section.capacity,
      position: section.position,
      seatLayout: section.seatLayout,
      isActive: section.isActive,
      seats,
      availableSeats,
      soldSeats,
      heldSeats,
    };
  }

  private transformSeatToResponse(seat: Seat): SeatResponseDto {
    return {
      id: seat.id,
      row: seat.row,
      number: seat.number,
      label: seat.label,
      status: seat.status,
      type: seat.type,
      price: seat.price,
      position: seat.position,
      heldUntil: seat.heldUntil,
      holdReference: seat.holdReference,
      isActive: seat.isActive,
      assignment: seat.assignment ? {
        id: seat.assignment.id,
        status: seat.assignment.status,
        assignedPrice: seat.assignment.assignedPrice,
        assignedAt: seat.assignment.assignedAt,
        userId: seat.assignment.userId,
        ticketId: seat.assignment.ticketId,
        purchaseReference: seat.assignment.purchaseReference,
      } : undefined,
    };
  }
}
