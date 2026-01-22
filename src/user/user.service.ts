import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private users = new Map<string, User>();

  createUser(params?: {
    email?: string;
    capabilities?: string[];
  }): User {
    const user = new User(
      randomUUID(),
      params?.email ?? null,
      params?.capabilities ?? [],
      [],
      [],
    );

    this.users.set(user.id, user);
    return user;
  }

  findById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  assignEventOwnership(userId: string, eventId: string) {
    const user = this.findById(userId);
    if (!user) throw new Error('User not found');

    user.ownedEventIds.push(eventId);
  }

  assignTicketOwnership(userId: string, ticketId: string) {
    const user = this.findById(userId);
    if (!user) throw new Error('User not found');

    user.ownedTicketIds.push(ticketId);
  }
}
