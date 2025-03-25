import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from "typeorm";
  
  @Entity()
  export class CampaignEmail {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @Column()
    subject: string;
  
    @Column("text")
    content: string;
  
    @Column({ nullable: true })
    targetAudience: string;
  
    @Column({ default: false })
    isSent: boolean;
  
    @Column({ nullable: true, type: "timestamp" })
    scheduledDate: Date;
  
    @Column({ default: false })
    isArchived: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @DeleteDateColumn()
    deletedAt?: Date;
  } 