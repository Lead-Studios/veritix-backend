import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ConferenceSponsorsService } from "./conference-sponsors.service";
import {
  CreateConferenceSponsorDto,
  ConferenceSponsorResponseDto,
} from "./dto/create-conference-sponsor.dto";
import { UpdateConferenceSponsorDto } from "./dto/update-conference-sponsor.dto";

import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "../../security/decorators/roles.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { UserRole } from "../../src/common/enums/users-roles.enum";

@ApiTags("conference-sponsors")
@Controller("conference-sponsors")
export class ConferenceSponsorsController {
  constructor(
    private readonly conferenceSponsorsService: ConferenceSponsorsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new sponsor" })
  @ApiResponse({
    status: 201,
    description: "The sponsor has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string' },
        brandWebsite: { type: 'string' },
        conferenceId: { type: 'string' },
        facebook: { type: 'string', nullable: true },
        twitter: { type: 'string', nullable: true },
        instagram: { type: 'string', nullable: true },
        brandImage: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('brandImage', {
      storage: diskStorage({
        destination: './uploads/conference-sponsors',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Body() createConferenceSponsorDto: CreateConferenceSponsorDto,
    @UploadedFile() brandImage: Express.Multer.File,
    @Request() req,
  ): Promise<ConferenceSponsorResponseDto> {
    return this.conferenceSponsorsService.create(
      createConferenceSponsorDto,
      brandImage,
      req.user,
    );
  }

  @Get()
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all sponsors" })
  @ApiResponse({ status: 200, description: "Return all sponsors." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async findAll(@Request() req): Promise<ConferenceSponsorResponseDto[]> {
    return this.conferenceSponsorsService.findAll(req.user);
  }

  @Get("conferences/:conferenceId")
  @ApiOperation({ summary: "Get all sponsors for a specific conference" })
  @ApiResponse({
    status: 200,
    description: "Return all sponsors for the specified conference.",
  })
  @ApiResponse({ status: 404, description: "Conference not found." })
  async findByConference(
    @Param("conferenceId") conferenceId: string,
  ): Promise<ConferenceSponsorResponseDto[]> {
    return this.conferenceSponsorsService.findByConference(conferenceId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a sponsor by ID" })
  @ApiResponse({ status: 200, description: "Return the sponsor." })
  @ApiResponse({ status: 404, description: "Sponsor not found." })
  async findOne(
    @Param("id") id: string,
  ): Promise<ConferenceSponsorResponseDto> {
    return this.conferenceSponsorsService.findOne(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a sponsor" })
  @ApiResponse({
    status: 200,
    description: "The sponsor has been successfully updated.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Sponsor not found." })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string' },
        brandWebsite: { type: 'string' },
        conferenceId: { type: 'string' },
        facebook: { type: 'string', nullable: true },
        twitter: { type: 'string', nullable: true },
        instagram: { type: 'string', nullable: true },
        brandImage: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('brandImage', {
      storage: diskStorage({
        destination: './uploads/conference-sponsors',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async update(
    @Param("id") id: string,
    @Body() updateConferenceSponsorDto: UpdateConferenceSponsorDto,
    @UploadedFile() brandImage: Express.Multer.File,
    @Request() req,
  ): Promise<ConferenceSponsorResponseDto> {
    return this.conferenceSponsorsService.update(
      id,
      updateConferenceSponsorDto,
      brandImage,
      req.user,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a sponsor" })
  @ApiResponse({
    status: 204,
    description: "The sponsor has been successfully deleted.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Sponsor not found." })
  async remove(@Param("id") id: string, @Request() req): Promise<void> {
    return this.conferenceSponsorsService.remove(id, req.user);
  }
}