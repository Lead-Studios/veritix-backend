import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Organizer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  password?: string; // Traditional login fallback

  @Column({ nullable: true })
  oauthProvider?: 'github' | 'linkedin' | string;

  @Column({ nullable: true })
  oauthProviderId?: string;
}
