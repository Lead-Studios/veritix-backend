import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { CreateBreakoutRoomDto } from '../dto/create-breakout-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Breakout Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events/:eventId/breakout-rooms')
export class BreakoutRoomController {
  constructor(private readonly breakoutRoomService: BreakoutRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new breakout room' })
  @ApiResponse({ status: 201, description: 'Breakout room created successfully' })
  async create(@Body() createBreakoutRoomDto: CreateBreakoutRoomDto) {
    return this.breakoutRoomService.createBreakoutRoom(createBreakoutRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all breakout rooms for an event' })
  @ApiResponse({ status: 200, description: 'Breakout rooms retrieved successfully' })
  async getBreakoutRooms(@Param('eventId') eventId: string) {
    return this.breakoutRoomService.getBreakoutRooms(eventId);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get a breakout room by ID' })
  @ApiResponse({ status: 200, description: 'Breakout room retrieved successfully' })
  async getBreakoutRoom(@Param('roomId') roomId: string) {
    return this.breakoutRoomService.getBreakoutRoom(roomId);
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a breakout room' })
  @ApiResponse({ status: 200, description: 'Joined breakout room successfully' })
  async joinBreakoutRoom(@Param('roomId') roomId: string, @Body() joinData: { userId: string }) {
    return this.breakoutRoomService.joinBreakoutRoom(roomId, joinData.userId);
  }

  @Post(':roomId/leave')
  @ApiOperation({ summary: 'Leave a breakout room' })
  @ApiResponse({ status: 200, description: 'Left breakout room successfully' })
  async leaveBreakoutRoom(@Param('roomId') roomId: string, @Body() leaveData: { userId: string }) {
    return this.breakoutRoomService.leaveBreakoutRoom(roomId, leaveData.userId);
  }

  @Post(':roomId/start')
  @ApiOperation({ summary: 'Start a breakout room session' })
  @ApiResponse({ status: 200, description: 'Breakout room started successfully' })
  async startBreakoutRoom(@Param('roomId') roomId: string) {
    return this.breakoutRoomService.startBreakoutRoom(roomId);
  }

  @Post(':roomId/end')
  @ApiOperation({ summary: 'End a breakout room session' })
  @ApiResponse({ status: 200, description: 'Breakout room ended successfully' })
  async endBreakoutRoom(@Param('roomId') roomId: string) {
    return this.breakoutRoomService.endBreakoutRoom(roomId);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a breakout room' })
  @ApiResponse({ status: 204, description: 'Breakout room deleted successfully' })
  async deleteBreakoutRoom(@Param('roomId') roomId: string) {
    return this.breakoutRoomService.deleteBreakoutRoom(roomId);
  }

  @Post(':roomId/moderators')
  @ApiOperation({ summary: 'Add a moderator to breakout room' })
  @ApiResponse({ status: 200, description: 'Moderator added successfully' })
  async addModerator(@Param('roomId') roomId: string, @Body() moderatorData: { userId: string }) {
    return this.breakoutRoomService.addModerator(roomId, moderatorData.userId);
  }

  @Delete(':roomId/moderators/:userId')
  @ApiOperation({ summary: 'Remove a moderator from breakout room' })
  @ApiResponse({ status: 200, description: 'Moderator removed successfully' })
  async removeModerator(@Param('roomId') roomId: string, @Param('userId') userId: string) {
    return this.breakoutRoomService.removeModerator(roomId, userId);
  }

  @Get(':roomId/analytics')
  @ApiOperation({ summary: 'Get breakout room analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Param('roomId') roomId: string) {
    return this.breakoutRoomService.getBreakoutRoomAnalytics(roomId);
  }
}
