import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
