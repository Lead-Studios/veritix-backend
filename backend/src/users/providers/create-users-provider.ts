import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { HashingProvider } from 'src/auth/providers/hashing-provider';

@Injectable()
export class CreateUsersProvider {
  constructor(
    /*
     * Inject hashing provider
     */
    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
    /*
     * Inject user repository
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    let existingUser: User;

    try {
      existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error finding user:', error.message);
        throw new RequestTimeoutException(
          'Unable to connect to database. Please try again later',
          { description: 'Error connecting to database' },
        );
      }
      throw new RequestTimeoutException('An unknown error occurred.');
    }

    if (existingUser) {
      throw new BadRequestException(
        'User already exists in the database. Use a different email',
      );
    }

    const hashedPassword = await this.hashingProvider.hashPassword(
      createUserDto.password,
    );

    const newUser: DeepPartial<User> = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);

    try {
      return savedUser;
    } catch (error) {
      console.error('Error saving user:', error);
      throw new RequestTimeoutException('Error connecting to the database');
    }
  }
}
