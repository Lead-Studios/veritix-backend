import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Attendee } from "./entities/attendee.entity"
import type { CreateAttendeeDto } from "./dto/create-attendee.dto"
import type { UpdateAttendeeDto } from "./dto/update-attendee.dto"
import type { ConferenceService } from "../conference/conference.service"
import * as QRCode from "qrcode"
import * as PDFDocument from "pdfkit"

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(Attendee)
    private attendeeRepository: Repository<Attendee>,
    private conferenceService: ConferenceService,
  ) {}

  async createAttendee(createAttendeeDto: CreateAttendeeDto): Promise<Attendee> {
    // Verify conference exists
    await this.conferenceService.findConferenceById(createAttendeeDto.conferenceId)

    const attendee = this.attendeeRepository.create(createAttendeeDto)
    return this.attendeeRepository.save(attendee)
  }

  async findAllAttendees(): Promise<Attendee[]> {
    return this.attendeeRepository.find()
  }

  async findAttendeeById(id: string): Promise<Attendee> {
    const attendee = await this.attendeeRepository.findOne({ where: { id } })

    if (!attendee) {
      throw new NotFoundException(`Attendee with ID ${id} not found`)
    }

    return attendee
  }

  async findAttendeesByConference(conferenceId: string): Promise<Attendee[]> {
    return this.attendeeRepository.find({ where: { conferenceId } })
  }

  async updateAttendee(id: string, updateAttendeeDto: UpdateAttendeeDto): Promise<Attendee> {
    const attendee = await this.findAttendeeById(id)

    Object.assign(attendee, updateAttendeeDto)

    return this.attendeeRepository.save(attendee)
  }

  async removeAttendee(id: string): Promise<void> {
    const attendee = await this.findAttendeeById(id)
    await this.attendeeRepository.remove(attendee)
  }

  async generateQRCode(attendeeId: string): Promise<string> {
    const attendee = await this.findAttendeeById(attendeeId)

    // Generate QR code with attendee information
    const qrData = JSON.stringify({
      id: attendee.id,
      name: `${attendee.firstName} ${attendee.lastName}`,
      conferenceId: attendee.conferenceId,
    })

    return QRCode.toDataURL(qrData)
  }

  async generateBadgePDF(attendeeId: string): Promise<Buffer> {
    const attendee = await this.findAttendeeById(attendeeId)
    const conference = await this.conferenceService.findConferenceById(attendee.conferenceId)
    const qrCodeDataUrl = await this.generateQRCode(attendeeId)

    // Create a PDF document
    const doc = new PDFDocument({
      size: [300, 400], // Badge size
      margin: 10,
    })

    // Buffer to store PDF
    const buffers = []
    doc.on("data", buffers.push.bind(buffers))

    // Conference name
    doc.fontSize(16).font("Helvetica-Bold").text(conference.name, { align: "center" })
    doc.moveDown()

    // Attendee name
    doc.fontSize(20).font("Helvetica-Bold").text(`${attendee.firstName} ${attendee.lastName}`, { align: "center" })
    doc.moveDown(0.5)

    // Company and job title
    if (attendee.company) {
      doc.fontSize(14).font("Helvetica").text(attendee.company, { align: "center" })
    }

    if (attendee.jobTitle) {
      doc.fontSize(12).font("Helvetica").text(attendee.jobTitle, { align: "center" })
    }

    doc.moveDown(2)

    // Add QR code
    const qrImage = qrCodeDataUrl.split(";base64,").pop()
    if (qrImage) {
      const qrBuffer = Buffer.from(qrImage, "base64")
      doc.image(qrBuffer, {
        fit: [150, 150],
        align: "center",
      })
    }

    doc.moveDown()

    // Add attendee ID for reference
    doc.fontSize(8).font("Helvetica").text(`ID: ${attendee.id}`, { align: "center" })

    // Finalize PDF
    doc.end()

    // Return PDF as buffer
    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers))
      })
    })
  }

  async generateBulkBadgesPDF(conferenceId: string): Promise<Buffer> {
    const attendees = await this.findAttendeesByConference(conferenceId)
    const conference = await this.conferenceService.findConferenceById(conferenceId)

    // Create a PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 10,
      autoFirstPage: false,
    })

    // Buffer to store PDF
    const buffers = []
    doc.on("data", buffers.push.bind(buffers))

    for (const attendee of attendees) {
      doc.addPage()

      // Conference name
      doc.fontSize(16).font("Helvetica-Bold").text(conference.name, { align: "center" })
      doc.moveDown()

      // Attendee name
      doc.fontSize(20).font("Helvetica-Bold").text(`${attendee.firstName} ${attendee.lastName}`, { align: "center" })
      doc.moveDown(0.5)

      // Company and job title
      if (attendee.company) {
        doc.fontSize(14).font("Helvetica").text(attendee.company, { align: "center" })
      }

      if (attendee.jobTitle) {
        doc.fontSize(12).font("Helvetica").text(attendee.jobTitle, { align: "center" })
      }

      doc.moveDown(2)

      // Add QR code
      const qrCodeDataUrl = await this.generateQRCode(attendee.id)
      const qrImage = qrCodeDataUrl.split(";base64,").pop()
      if (qrImage) {
        const qrBuffer = Buffer.from(qrImage, "base64")
        doc.image(qrBuffer, {
          fit: [200, 200],
          align: "center",
        })
      }

      doc.moveDown()

      // Add attendee ID for reference
      doc.fontSize(8).font("Helvetica").text(`ID: ${attendee.id}`, { align: "center" })
    }

    // Finalize PDF
    doc.end()

    // Return PDF as buffer
    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers))
      })
    })
  }
}
