import { IsInt, IsString } from 'class-validator';

export class IssueCertificateDto {
  @IsInt()
  conferenceId: number;

  @IsString()
  attendeeId: string;

  @IsString()
  fileUrl: string;
}
