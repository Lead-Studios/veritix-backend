import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailTemplate } from './email-template.entity';

export enum ComponentType {
  HEADER = 'header',
  TEXT = 'text',
  IMAGE = 'image',
  BUTTON = 'button',
  DIVIDER = 'divider',
  SPACER = 'spacer',
  SOCIAL = 'social',
  FOOTER = 'footer',
  HERO = 'hero',
  COLUMNS = 'columns',
  EVENT_DETAILS = 'event_details',
  TICKET_INFO = 'ticket_info',
  COUNTDOWN = 'countdown',
  CUSTOM_HTML = 'custom_html',
}

@Entity('template_components')
@Index(['templateId', 'sortOrder'])
export class TemplateComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  templateId: string;

  @Column({
    type: 'enum',
    enum: ComponentType,
  })
  componentType: ComponentType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'json' })
  properties: {
    // Text component
    text?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    
    // Image component
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    
    // Button component
    buttonText?: string;
    buttonUrl?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    
    // Layout properties
    padding?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    backgroundColor?: string;
    borderRadius?: number;
    border?: {
      width: number;
      style: string;
      color: string;
    };
    
    // Responsive properties
    mobileProperties?: Record<string, any>;
    
    // Custom properties for specific components
    customProperties?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  conditions: {
    showIf?: {
      variable: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
    hideIf?: {
      variable: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
  };

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailTemplate, (template) => template.components)
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;
}
