import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
export declare class FindOneByEmailProvider {
    private userRepository;
    constructor(userRepository: Repository<User>);
    FindByEmail(email: string): Promise<User>;
}
