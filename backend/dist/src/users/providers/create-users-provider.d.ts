import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { HashingProvider } from 'src/auth/providers/hashing-provider';
export declare class CreateUsersProvider {
    private readonly hashingProvider;
    private readonly userRepository;
    constructor(hashingProvider: HashingProvider, userRepository: Repository<User>);
    createUser(createUserDto: CreateUserDto): Promise<User>;
}
