import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Users } from './entities/event.entity';
import { NotFoundDomainException } from 'src/common/exceptions/not-found.exception';

@Injectable()
export class UsersService {
  private readonly usersRepository: Repository<Users>;
  async findOne(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundDomainException('User', id);
    }

    return user;
  }
}
