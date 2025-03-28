import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { User } from "./entities/user.entity"

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Existing methods...

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOne({ where: { id } })
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({ where: { email } })
  }

  async getUserPurchaseCount(userId: string): Promise<number> {
    // This would typically query the orders/purchases table to count completed purchases
    // For simplicity, we're returning a mock count here
    const user = await this.findOne(userId)
    if (!user) {
      return 0
    }

    // In a real implementation, you would query the database
    // return this.ordersRepository.count({ where: { userId, status: 'completed' } });

    // Mock implementation
    return Math.floor(Math.random() * 10) // Random number between 0-9 for demo purposes
  }
}

