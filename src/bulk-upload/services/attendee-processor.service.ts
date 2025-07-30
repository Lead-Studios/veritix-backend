import { Injectable } from "@nestjs/common"
import type { AttendeeBulkData, BulkUploadResult, BulkUploadError } from "../dto/bulk-upload.dto"

// Assuming you have these entities in your project
interface Attendee {
  id: string
  eventId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  ticketType: string
  specialRequirements?: string
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class AttendeeProcessorService {
  constructor(
    // Inject your attendee repository here
    // @InjectRepository(Attendee)
    // private attendeeRepository: Repository<Attendee>,
  ) {}

  async processAttendees(
    attendeeData: AttendeeBulkData[],
    eventId: string,
    uploadId: string,
  ): Promise<BulkUploadResult> {
    const errors: BulkUploadError[] = []
    let successfulRecords = 0
    let failedRecords = 0

    for (let i = 0; i < attendeeData.length; i++) {
      const attendee = attendeeData[i]
      const rowNumber = i + 1

      try {
        await this.validateAndCreateAttendee(attendee, eventId)
        successfulRecords++
      } catch (error) {
        failedRecords++
        errors.push({
          row: rowNumber,
          message: error.message,
          data: attendee,
        })
      }
    }

    return {
      success: failedRecords === 0,
      totalRecords: attendeeData.length,
      successfulRecords,
      failedRecords,
      errors,
      uploadId,
    }
  }

  private async validateAndCreateAttendee(attendeeData: AttendeeBulkData, eventId: string): Promise<void> {
    // Check for duplicate email in the same event
    // const existingAttendee = await this.attendeeRepository.findOne({
    //   where: {
    //     eventId,
    //     email: attendeeData.email,
    //   },
    // });

    // if (existingAttendee) {
    //   throw new Error(`Attendee with email '${attendeeData.email}' already exists for this event`);
    // }

    // Validate phone number format if provided
    if (attendeeData.phone) {
      const phoneRegex = /^\+?[\d\s\-$$$$]+$/
      if (!phoneRegex.test(attendeeData.phone)) {
        throw new Error("Invalid phone number format")
      }
    }

    // Create the attendee
    // const attendee = this.attendeeRepository.create({
    //   eventId,
    //   firstName: attendeeData.firstName,
    //   lastName: attendeeData.lastName,
    //   email: attendeeData.email,
    //   phone: attendeeData.phone,
    //   ticketType: attendeeData.ticketType,
    //   specialRequirements: attendeeData.specialRequirements,
    // });

    // await this.attendeeRepository.save(attendee);

    // For now, simulate the creation
    console.log(`Creating attendee: ${JSON.stringify({ eventId, ...attendeeData })}`)
  }
}
