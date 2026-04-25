import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

export interface DeleteAccountInput {
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Clear the refresh token hash for a user (logout)
   * @param userId - ID of the user to logout
   * @throws NotFoundException if user doesn't exist
   */
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, {
      currentRefreshTokenHash: null,
    });
  }

  /**
   * Delete a user account with soft delete and PII anonymisation
   * @param userId - ID of the user to delete
   * @param input - Contains password for confirmation
   * @throws ForbiddenException if password is incorrect
   * @throws NotFoundException if user doesn't exist
   */
  async deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
    // Find the user
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }

    // Anonymise PII and perform soft delete
    await this.userRepository.update(userId, {
      email: `deleted_${userId}@veritix.io`,
      fullName: 'Deleted User',
      deletedAt: new Date(),
      tokenVersion: user.tokenVersion + 1,
    });
  }
}
