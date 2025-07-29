import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MulterModule } from "@nestjs/platform-express"
import { BulkUploadController } from "./controllers/bulk-upload.controller"
import { BulkUploadService } from "./services/bulk-upload.service"
import { FileParserService } from "./services/file-parser.service"
import { TicketProcessorService } from "./services/ticket-processor.service"
import { AttendeeProcessorService } from "./services/attendee-processor.service"
import { BulkUpload } from "./entities/bulk-upload.entity"
import { diskStorage } from "multer"
import { extname } from "path"

@Module({
  imports: [
    TypeOrmModule.forFeature([BulkUpload]),
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join("")
          cb(null, `${randomName}${extname(file.originalname)}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new Error("Only CSV and Excel files are allowed"), false)
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService, FileParserService, TicketProcessorService, AttendeeProcessorService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
