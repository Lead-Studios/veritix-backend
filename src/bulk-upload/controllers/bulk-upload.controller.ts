import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from "@nestjs/swagger"
import type { BulkUploadService } from "../services/bulk-upload.service"
import { type BulkUploadDto, BulkUploadResult, BulkUploadType } from "../dto/bulk-upload.dto"
import { BulkUpload } from "../entities/bulk-upload.entity"
import type { Express } from "express"

@ApiTags("Bulk Upload")
@Controller("bulk-upload")
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload CSV/Excel file for bulk import" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        type: {
          type: "string",
          enum: Object.values(BulkUploadType),
        },
        eventId: {
          type: "string",
        },
        description: {
          type: "string",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "File uploaded and processed successfully",
    type: BulkUploadResult,
  })
  async uploadFile(
    file: Express.Multer.File,
    @Body(ValidationPipe) uploadDto: BulkUploadDto,
  ): Promise<BulkUploadResult> {
    // In a real application, you would get the user ID from the authentication context
    const userId = "current-user-id" // Replace with actual user ID from auth

    return this.bulkUploadService.uploadFile(file, uploadDto, userId)
  }

  @Get('status/:uploadId')
  @ApiOperation({ summary: 'Get upload status by ID' })
  @ApiResponse({
    status: 200,
    description: 'Upload status retrieved successfully',
    type: BulkUpload,
  })
  async getUploadStatus(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<BulkUpload> {
    return this.bulkUploadService.getUploadStatus(uploadId);
  }

  @Get("history/:eventId")
  @ApiOperation({ summary: "Get upload history for an event" })
  @ApiResponse({
    status: 200,
    description: "Upload history retrieved successfully",
  })
  async getUploadHistory(
    @Param('eventId') eventId: string,
    @Query('type') type?: BulkUploadType,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<{ uploads: BulkUpload[]; total: number }> {
    return this.bulkUploadService.getUploadHistory(eventId, type, limit, offset)
  }

  @Delete(':uploadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete upload record' })
  @ApiResponse({
    status: 204,
    description: 'Upload deleted successfully',
  })
  async deleteUpload(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<void> {
    return this.bulkUploadService.deleteUpload(uploadId);
  }

  @Get('template/:type')
  @ApiOperation({ summary: 'Get CSV template for bulk upload' })
  @ApiResponse({
    status: 200,
    description: 'Template headers retrieved successfully',
  })
  async getTemplate(
    @Param('type') type: BulkUploadType,
  ): Promise<{ headers: string[] }> {
    const headers = await this.bulkUploadService.getUploadTemplate(type);
    return { headers };
  }
}
