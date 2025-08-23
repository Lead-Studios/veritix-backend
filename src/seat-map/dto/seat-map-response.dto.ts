import { SeatStatus, SeatType } from '../entities/seat.entity';
import { SectionType } from '../entities/section.entity';
import { AssignmentStatus } from '../entities/seat-assignment.entity';

export class SeatResponseDto {
  id: string;
  row: string;
  number: string;
  label: string;
  status: SeatStatus;
  type: SeatType;
  price?: number;
  position?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  heldUntil?: Date;
  holdReference?: string;
  isActive: boolean;
  assignment?: {
    id: string;
    status: AssignmentStatus;
    assignedPrice: number;
    assignedAt: Date;
    userId?: string;
    ticketId?: string;
    purchaseReference?: string;
  };
}

export class SectionResponseDto {
  id: string;
  name: string;
  type: SectionType;
  basePrice?: number;
  color?: string;
  capacity: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  seatLayout?: {
    rows: number;
    seatsPerRow: number;
    aislePositions?: number[];
    rowLabels?: string[];
  };
  isActive: boolean;
  seats: SeatResponseDto[];
  availableSeats: number;
  soldSeats: number;
  heldSeats: number;
}

export class SeatMapResponseDto {
  id: string;
  name: string;
  description?: string;
  venueName: string;
  totalCapacity: number;
  layout?: {
    width: number;
    height: number;
    orientation?: 'landscape' | 'portrait';
    stage?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  isActive: boolean;
  eventId: string;
  sections: SectionResponseDto[];
  totalAvailableSeats: number;
  totalSoldSeats: number;
  totalHeldSeats: number;
  createdAt: Date;
  updatedAt: Date;
}
