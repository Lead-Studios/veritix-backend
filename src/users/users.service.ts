import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { NotFoundDomainException } from 'src/common/exceptions/not-found.exception';

@Injectable()
export class UsersService {
  private readonly usersRepository: Repository<User>;
  async findOne(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundDomainException('User', id);
    }

    return user;
  }
}
