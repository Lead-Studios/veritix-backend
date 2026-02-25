import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  ContactCategory,
  ContactStatus,
} from '../interfaces/contact.interface';

@Entity('contact_messages')
@Index(['status'])
@Index(['category'])
@Index(['userId'])
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 150 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ContactCategory,
    default: ContactCategory.GENERAL,
    comment: 'Inquiry category',
  })
  category: ContactCategory;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW,
    comment: 'Current workflow status',
  })
  status: ContactStatus;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Authenticated user who submitted the inquiry',
  })
  userId: string | null;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Related event, if applicable',
  })
  eventId: string | null;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Staff member assigned to this inquiry',
  })
  assignedTo: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Staff response to the inquiry',
  })
  response: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When a response was sent',
  })
  respondedAt: Date | null;

  @Column({ length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ length: 200, nullable: true })
  companyName: string | null;

  @Column({ length: 100, nullable: true })
  website: string | null;

  @Column({ length: 50, nullable: true, default: 'normal' })
  priority: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'JSON array of attachment URLs',
  })
  attachmentUrls: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Internal staff notes' })
  internalNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  followUpDate: Date | null;

  @Column({ length: 500, nullable: true, comment: 'Comma-separated tags' })
  tags: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
