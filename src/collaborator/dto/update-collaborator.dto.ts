import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { CollaboratorRole } from './create-collaborator.dto';

export class UpdateCollaboratorDto {
  @ApiPropertyOptional({
    description: 'Updated name of the collaborator',
    example: 'John A. Smith'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated email of the collaborator',
    example: 'john.a.smith@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated event ID for the collaborator',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Updated role of the collaborator',
    enum: CollaboratorRole,
    example: CollaboratorRole.EVENT_MANAGER
  })
  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;

  @ApiPropertyOptional({
    description: 'Updated custom permissions for the collaborator',
    example: ['manage_tickets', 'view_analytics', 'manage_sponsors']
  })
  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Updated notes about the collaborator\'s responsibilities',
    example: 'Manages ticket sales, event logistics, and sponsor relationships'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether the collaborator is active',
    example: true
  })
  @IsOptional()
  isActive?: boolean;
}