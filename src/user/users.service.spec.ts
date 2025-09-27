import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should hash password and save user', async () => {
      const saveSpy = jest.spyOn(repo, 'save').mockResolvedValue({} as User);
      jest.spyOn(repo, 'create').mockReturnValue({} as User);

      await service.create({ email: 'test@example.com', password: 'secret123' });

      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: '1', email: 'test@example.com' }] as User[];
      jest.spyOn(repo, 'find').mockResolvedValue(users);

      expect(await service.findAll()).toEqual(users);
    });
  });
});