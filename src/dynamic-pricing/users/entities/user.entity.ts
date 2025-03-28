import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum UserRole {
  USER = "user",
  ORGANIZER = "organizer",
  ADMIN = "admin",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  email: string

  @Column()
  name: string

  @Column({ select: false })
  password: string

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

