import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a user successfully', async () => {
    const user = { id: 1, email: 'test@mail.com', password: 'hashed' } as User;
    jest.spyOn(repo, 'save').mockResolvedValue(user);

    const result = await service.create({ email: 'test@mail.com', password: '123456' });
    expect(result.email).toBe('test@mail.com');
  });
});
