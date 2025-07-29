import { Injectable, BadRequestException } from "@nestjs/common"
import * as XLSX from "xlsx"
import * as csv from "csv-parser"
import { Readable } from "stream"
import { type TicketBulkData, type AttendeeBulkData, BulkUploadType } from "../dto/bulk-upload.dto"

@Injectable()
export class FileParserService {
  async parseFile(
    buffer: Buffer,
    fileName: string,
    type: BulkUploadType,
  ): Promise<TicketBulkData[] | AttendeeBulkData[]> {
    const fileExtension = fileName.split(".").pop()?.toLowerCase()

    let data: any[]

    if (fileExtension === "csv") {
      data = await this.parseCsv(buffer)
    } else if (["xlsx", "xls"].includes(fileExtension)) {
      data = this.parseExcel(buffer)
    } else {
      throw new BadRequestException("Unsupported file format. Please use CSV or Excel files.")
    }

    return this.validateAndTransformData(data, type)
  }

  private async parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = []
      const stream = Readable.from(buffer.toString())

      stream
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error))
    })
  }

  private parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    return XLSX.utils.sheet_to_json(worksheet)
  }

  private validateAndTransformData(data: any[], type: BulkUploadType): TicketBulkData[] | AttendeeBulkData[] {
    if (type === BulkUploadType.TICKETS) {
      return this.validateTicketData(data)
    } else {
      return this.validateAttendeeData(data)
    }
  }

  private validateTicketData(data: any[]): TicketBulkData[] {
    const requiredFields = ["ticketType", "price", "quantity"]

    return data.map((row, index) => {
      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] && row[field] !== 0) {
          throw new BadRequestException(`Missing required field '${field}' in row ${index + 1}`)
        }
      }

      return {
        ticketType: String(row.ticketType).trim(),
        price: this.parseNumber(row.price, `price in row ${index + 1}`),
        quantity: this.parseNumber(row.quantity, `quantity in row ${index + 1}`),
        description: row.description ? String(row.description).trim() : undefined,
        transferable: this.parseBoolean(row.transferable, true),
        resellable: this.parseBoolean(row.resellable, true),
        maxResellPrice: row.maxResellPrice
          ? this.parseNumber(row.maxResellPrice, `maxResellPrice in row ${index + 1}`)
          : undefined,
      }
    })
  }

  private validateAttendeeData(data: any[]): AttendeeBulkData[] {
    const requiredFields = ["firstName", "lastName", "email", "ticketType"]

    return data.map((row, index) => {
      // Check required fields
      for (const field of requiredFields) {
        if (!row[field]) {
          throw new BadRequestException(`Missing required field '${field}' in row ${index + 1}`)
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(row.email)) {
        throw new BadRequestException(`Invalid email format in row ${index + 1}`)
      }

      return {
        firstName: String(row.firstName).trim(),
        lastName: String(row.lastName).trim(),
        email: String(row.email).trim().toLowerCase(),
        phone: row.phone ? String(row.phone).trim() : undefined,
        ticketType: String(row.ticketType).trim(),
        specialRequirements: row.specialRequirements ? String(row.specialRequirements).trim() : undefined,
      }
    })
  }

  private parseNumber(value: any, fieldName: string): number {
    const num = Number(value)
    if (isNaN(num) || num < 0) {
      throw new BadRequestException(`Invalid number for ${fieldName}`)
    }
    return num
  }

  private parseBoolean(value: any, defaultValue = false): boolean {
    if (value === undefined || value === null || value === "") {
      return defaultValue
    }

    const str = String(value).toLowerCase().trim()
    return ["true", "1", "yes", "y"].includes(str)
  }
}
