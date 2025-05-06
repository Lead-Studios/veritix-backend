import { IsNotEmpty, IsUUID } from "class-validator"

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  sessionId: string

  @IsNotEmpty()
  @IsUUID()
  attendeeId: string
}
