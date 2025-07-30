import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RsvpService } from './rsvp.service';
import { RSVP } from './rsvp.entity';
import { CreateRsvpDto } from './rsvp.dto';


@ApiTags('RSVP')
@Controller('rsvp')
export class RsvpController {
  constructor(
    private readonly rsvpService: RsvpService
) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'RSVP to a free event' })
  @ApiResponse({
    status: 201,
    description: 'User has successfully RSVPed to the event',
    type: RSVP,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or event is at full capacity',
  })
  @ApiBody({ type: CreateRsvpDto })
  async create(@Body() dto: CreateRsvpDto, @Req() req): Promise<RSVP> {
    return this.rsvpService.createRSVP(dto.eventId, req.user);
  }
}