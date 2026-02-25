import {
  Controller,
  Body,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import {
  ContactQueryDto,
  RespondToInquiryDto,
  AssignInquiryDto,
} from './dto/contact-operations.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { User } from '../auth/entities/user.entity';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a contact inquiry (public)' })
  @ApiResponse({ status: 201, description: 'Inquiry submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async submit(@Body() dto: CreateContactMessageDto) {
    const inquiry = await this.contactService.create(dto);
    return { success: true, id: inquiry.id };
  }

  // ─── Authenticated user ──────────────────────────────────────────────────

  @Get('my-inquiries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "List the current user's own contact inquiries" })
  @ApiResponse({ status: 200, description: 'List of inquiries returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyInquiries(@CurrentUser() user: User) {
    return this.contactService.findByUser(user.id);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'List all contact inquiries with filters and pagination (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of inquiries returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  async findAll(@Query() query: ContactQueryDto) {
    return this.contactService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get inquiry counts grouped by status (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Status counts returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  async getStats() {
    return this.contactService.getStatusCounts();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a single inquiry by ID (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Inquiry UUID' })
  @ApiResponse({ status: 200, description: 'Inquiry returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.findById(id);
  }

  @Patch(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Respond to an inquiry and send email notification to submitter (admin only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Inquiry UUID' })
  @ApiResponse({
    status: 200,
    description: 'Response sent and inquiry updated',
  })
  @ApiResponse({ status: 400, description: 'Invalid response data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToInquiryDto,
    @CurrentUser() user: User,
  ) {
    return this.contactService.respond(id, dto.response, user.id);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark an inquiry as resolved (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Inquiry UUID' })
  @ApiResponse({ status: 200, description: 'Inquiry marked as resolved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.resolve(id);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign an inquiry to a staff member (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Inquiry UUID' })
  @ApiResponse({
    status: 200,
    description: 'Inquiry assigned and status set to REVIEWED',
  })
  @ApiResponse({ status: 400, description: 'Invalid staff ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignInquiryDto,
  ) {
    return this.contactService.assign(id, dto.staffId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hard-delete an inquiry (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Inquiry UUID' })
  @ApiResponse({ status: 204, description: 'Inquiry deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.contactService.delete(id);
  }
}
