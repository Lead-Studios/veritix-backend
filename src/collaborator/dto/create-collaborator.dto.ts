import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsUUID, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum CollaboratorRole {
  EVENT_MANAGER = 'event_manager',
  TICKET_MANAGER = 'ticket_manager',
  CONTENT_EDITOR = 'content_editor',
  VIEWER = 'viewer'
}

export class CreateCollaboratorDto {
  @ApiProperty({
    description: 'Name of the collaborator',
    example: 'John Smith'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email of the collaborator',
    example: 'john.smith@example.com'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Event ID associated with the collaborator',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'Conference ID associated with the collaborator',
    example: '456e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  conferenceId: string;

  @ApiProperty({
    description: 'Role of the collaborator for the event',
    enum: CollaboratorRole,
    example: CollaboratorRole.EVENT_MANAGER
  })
  @IsNotEmpty()
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;

  @ApiPropertyOptional({
    description: 'Custom permissions for the collaborator',
    example: ['manage_tickets', 'view_analytics']
  })
  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Notes about the collaborator\'s responsibilities',
    example: 'Manages ticket sales and event logistics'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}