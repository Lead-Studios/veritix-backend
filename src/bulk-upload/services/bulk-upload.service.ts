import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type BulkUpload, BulkUploadStatus } from "../entities/bulk-upload.entity"
import type { FileParserService } from "./file-parser.service"
import type { TicketProcessorService } from "./ticket-processor.service"
import type { AttendeeProcessorService } from "./attendee-processor.service"
import { type BulkUploadDto, type BulkUploadResult, BulkUploadType } from "../dto/bulk-upload.dto"
import type { Express } from "express"

@Injectable()
export class BulkUploadService {
  constructor(
    private bulkUploadRepository: Repository<BulkUpload>,
    private fileParserService: FileParserService,
    private ticketProcessorService: TicketProcessorService,
    private attendeeProcessorService: AttendeeProcessorService,
  ) {}

  async uploadFile(file: Express.Multer.File, uploadDto: BulkUploadDto, userId: string): Promise<BulkUploadResult> {
    // Create upload record
    const upload = this.bulkUploadRepository.create({
      type: uploadDto.type,
      eventId: uploadDto.eventId,
      fileName: file.filename,
      originalFileName: file.originalname,
      description: uploadDto.description,
      uploadedBy: userId,
      status: BulkUploadStatus.PROCESSING,
    })

    const savedUpload = await this.bulkUploadRepository.save(upload)

    try {
      // Parse file
      const parsedData = await this.fileParserService.parseFile(file.buffer, file.originalname, uploadDto.type)

      savedUpload.totalRecords = parsedData.length
      await this.bulkUploadRepository.save(savedUpload)

      // Process data
      let result: BulkUploadResult

      if (uploadDto.type === BulkUploadType.TICKETS) {
        result = await this.ticketProcessorService.processTickets(
          parsedData as any[],
          uploadDto.eventId,
          savedUpload.id,
        )
      } else {
        result = await this.attendeeProcessorService.processAttendees(
          parsedData as any[],
          uploadDto.eventId,
          savedUpload.id,
        )
      }

      // Update upload record
      savedUpload.successfulRecords = result.successfulRecords
      savedUpload.failedRecords = result.failedRecords
      savedUpload.errors = result.errors
      savedUpload.status = result.failedRecords > 0 ? BulkUploadStatus.PARTIAL : BulkUploadStatus.COMPLETED
      savedUpload.processedAt = new Date()

      await this.bulkUploadRepository.save(savedUpload)

      return {
        ...result,
        uploadId: savedUpload.id,
      }
    } catch (error) {
      // Update upload record on failure
      savedUpload.status = BulkUploadStatus.FAILED
      savedUpload.errors = [
        {
          row: 0,
          message: error.message,
        },
      ]
      await this.bulkUploadRepository.save(savedUpload)

      throw error
    }
  }

  async getUploadStatus(uploadId: string): Promise<BulkUpload> {
    const upload = await this.bulkUploadRepository.findOne({
      where: { id: uploadId },
    })

    if (!upload) {
      throw new NotFoundException("Upload not found")
    }

    return upload
  }

  async getUploadHistory(
    eventId: string,
    type?: BulkUploadType,
    limit = 50,
    offset = 0,
  ): Promise<{ uploads: BulkUpload[]; total: number }> {
    const queryBuilder = this.bulkUploadRepository
      .createQueryBuilder("upload")
      .where("upload.eventId = :eventId", { eventId })

    if (type) {
      queryBuilder.andWhere("upload.type = :type", { type })
    }

    const [uploads, total] = await queryBuilder
      .orderBy("upload.createdAt", "DESC")
      .limit(limit)
      .offset(offset)
      .getManyAndCount()

    return { uploads, total }
  }

  async deleteUpload(uploadId: string): Promise<void> {
    const result = await this.bulkUploadRepository.delete(uploadId)

    if (result.affected === 0) {
      throw new NotFoundException("Upload not found")
    }
  }

  async getUploadTemplate(type: BulkUploadType): Promise<string[]> {
    if (type === BulkUploadType.TICKETS) {
      return ["ticketType", "price", "quantity", "description", "transferable", "resellable", "maxResellPrice"]
    } else {
      return ["firstName", "lastName", "email", "phone", "ticketType", "specialRequirements"]
    }
  }
}
