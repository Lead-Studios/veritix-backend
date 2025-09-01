import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Post,
} from '@nestjs/common';
import { SessionManagementService } from '../services/session-management.service';
import { SessionResponseDto } from '../dto/session-response.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('sessions')
@UseGuards(AuthGuard('jwt'))
export class SessionManagementController {
  constructor(private sessionService: SessionManagementService) {}

  @Get()
  async getUserSessions(@Request() req): Promise<SessionResponseDto[]> {
    return this.sessionService.getUserSessions(req.user.sub);
  }

  @Get(':sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ): Promise<SessionResponseDto> {
    return this.sessionService.getSessionById(sessionId, req.user.sub);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Query('reason') reason?: string,
  ): Promise<void> {
    await this.sessionService.revokeSession(
      sessionId,
      req.user.sub,
      'user',
      reason,
    );
  }

  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Request() req,
    @Query('except-current') exceptCurrent?: boolean,
  ): Promise<{ revokedCount: number }> {
    const currentSessionId = exceptCurrent ? req.sessionId : undefined;
    const revokedCount = await this.sessionService.revokeAllSessions(
      req.user.sub,
      currentSessionId,
      'user',
    );

    return { revokedCount };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllSessionsAlternative(
    @Request() req,
    @Query('except-current') exceptCurrent?: boolean,
    @Query('reason') reason?: string,
  ): Promise<void> {
    const currentSessionId = exceptCurrent ? req.sessionId : undefined;
    await this.sessionService.revokeAllSessions(
      req.user.sub,
      currentSessionId,
      'user',
    );
  }
}
