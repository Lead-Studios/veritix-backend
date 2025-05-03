import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Event } from "../../events/entities/event.entity";
import { CollaboratorRole } from "../dto/create-collaborator.dto";

@Entity()
export class Collaborator {
  @ApiProperty({
    description: "Unique identifier of the collaborator",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "Name of the collaborator",
    example: "John Smith",
  })
  @Column()
  name: string;

  @ApiProperty({
    description: "Email of the collaborator",
    example: "john.smith@example.com",
  })
  @Column()
  email: string;

  @ApiPropertyOptional({
    description: "URL of the collaborator's image",
    example: "https://example.com/images/collaborator.jpg",
  })
  @Column({ nullable: true })
  imageUrl?: string;

  @ApiProperty({
    description: "Role of the collaborator",
    enum: CollaboratorRole,
    example: CollaboratorRole.EVENT_MANAGER,
  })
  @Column({
    type: "enum",
    enum: CollaboratorRole,
    default: CollaboratorRole.VIEWER,
  })
  role: CollaboratorRole;

  @ApiPropertyOptional({
    description: "Custom permissions assigned to the collaborator",
    example: ["manage_tickets", "view_analytics"],
  })
  @Column("simple-array", { nullable: true })
  permissions?: string[];

  @ApiProperty({
    description: "Event this collaborator is associated with",
    type: () => Event,
  })
  @ManyToOne(() => Event, (event) => event.collaborators)
  event: Event;

  @ApiPropertyOptional({
    description: "Notes about the collaborator's responsibilities",
    example: "Manages ticket sales and event logistics",
  })
  @Column("text", { nullable: true })
  notes?: string;

  @ApiProperty({
    description: "Whether the collaborator is active",
    example: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: "Date when the collaborator was added",
    example: "2025-04-30T10:00:00Z",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: "Date when the collaborator was last updated",
    example: "2025-04-30T15:30:00Z",
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: "Date when the collaborator was last accessed the event",
    example: "2025-04-30T16:45:00Z",
  })
  @Column({ type: "timestamp", nullable: true })
  lastAccessAt?: Date;

  @ApiPropertyOptional({
    description: "Additional metadata about the collaborator",
    example: {
      department: "Events Team",
      location: "San Francisco",
      timezone: "America/Los_Angeles",
    },
  })
  @Column("json", { nullable: true })
  metadata?: Record<string, any>;
}
