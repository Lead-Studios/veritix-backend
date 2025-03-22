import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class SpecialGuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  facebook?: string;

  @Column({ nullable: true })
  twitter?: string;

  @Column({ nullable: true })
  instagram?: string;
}
