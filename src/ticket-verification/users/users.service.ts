import { Injectable } from "@nestjs/common"
import * as bcrypt from "bcrypt"
import type { User } from "./interfaces/user.interface"
import { Role } from "../auth/enums/role.enum"

@Injectable()
export class UsersService {
  // In-memory storage for demo purposes
  // In a real application, this would use a database
  private readonly users: User[] = [
    {
      id: "1",
      username: "admin",
      email: "admin@example.com",
      password: "$2b$10$7EoW/9TbU0RZpqZZvdVzb.7vRRLGZUUJ1bHh8gRmVgRCH5CQJMFyW", // hashed 'admin123'
      roles: [Role.ADMIN],
    },
    {
      id: "2",
      username: "organizer",
      email: "organizer@example.com",
      password: "$2b$10$7EoW/9TbU0RZpqZZvdVzb.7vRRLGZUUJ1bHh8gRmVgRCH5CQJMFyW", // hashed 'organizer123'
      roles: [Role.EVENT_ORGANIZER],
    },
    {
      id: "3",
      username: "user",
      email: "user@example.com",
      password: "$2b$10$7EoW/9TbU0RZpqZZvdVzb.7vRRLGZUUJ1bHh8gRmVgRCH5CQJMFyW", // hashed 'user123'
      roles: [Role.USER],
    },
  ]

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id)
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username)
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((user) => user.email === email)
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }
}

