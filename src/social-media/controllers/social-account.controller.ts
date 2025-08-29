import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SocialAccount } from '../entities/social-account.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export interface CreateSocialAccountDto {
  organizerId: string;
  platform: string;
  accountName: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  permissions?: string[];
  settings?: any;
}

export interface UpdateSocialAccountDto {
  accountName?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  permissions?: string[];
  settings?: any;
}

// Mock service for demonstration - would be injected
class SocialAccountService {
  async create(dto: CreateSocialAccountDto): Promise<SocialAccount> {
    // Implementation would be here
    return {} as SocialAccount;
  }

  async findById(id: string): Promise<SocialAccount> {
    return {} as SocialAccount;
  }

  async findByOrganizer(organizerId: string): Promise<SocialAccount[]> {
    return [];
  }

  async update(id: string, dto: UpdateSocialAccountDto): Promise<SocialAccount> {
    return {} as SocialAccount;
  }

  async delete(id: string): Promise<void> {
    // Implementation
  }

  async refreshToken(id: string): Promise<SocialAccount> {
    return {} as SocialAccount;
  }

  async validateConnection(id: string): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }
}

@ApiTags('Social Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-accounts')
export class SocialAccountController {
  constructor(private readonly socialAccountService: SocialAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Connect a new social media account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Social account connected successfully',
    type: SocialAccount,
  })
  async connectAccount(@Body() dto: CreateSocialAccountDto): Promise<SocialAccount> {
    return this.socialAccountService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get social account by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social account retrieved successfully',
    type: SocialAccount,
  })
  async getAccount(@Param('id') id: string): Promise<SocialAccount> {
    return this.socialAccountService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get social accounts by organizer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social accounts retrieved successfully',
    type: [SocialAccount],
  })
  async getAccountsByOrganizer(
    @Query('organizerId') organizerId: string,
  ): Promise<SocialAccount[]> {
    return this.socialAccountService.findByOrganizer(organizerId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update social account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social account updated successfully',
    type: SocialAccount,
  })
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateSocialAccountDto,
  ): Promise<SocialAccount> {
    return this.socialAccountService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disconnect social account' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Social account disconnected successfully',
  })
  async disconnectAccount(@Param('id') id: string): Promise<void> {
    return this.socialAccountService.delete(id);
  }

  @Post(':id/refresh-token')
  @ApiOperation({ summary: 'Refresh access token for social account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: SocialAccount,
  })
  async refreshToken(@Param('id') id: string): Promise<SocialAccount> {
    return this.socialAccountService.refreshToken(id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate social account connection' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection validation result',
  })
  async validateConnection(
    @Param('id') id: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    return this.socialAccountService.validateConnection(id);
  }
}
