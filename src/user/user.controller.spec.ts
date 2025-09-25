import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest
              .fn()
              .mockResolvedValue({ id: '1', email: 'test@example.com' }),
            update: jest.fn().mockResolvedValue({ id: '1', role: 'admin' }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all users', async () => {
    expect(await controller.findAll()).toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should create a user', async () => {
    const dto = { email: 'test@example.com', password: 'secret123' };
    expect(await controller.create(dto)).toEqual({
      id: '1',
      email: 'test@example.com',
    });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should update a user', async () => {
    const dto = { role: 'admin' };
    expect(await controller.update('1', dto)).toEqual({
      id: '1',
      role: 'admin',
    });
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('should delete a user', async () => {
    expect(await controller.remove('1')).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});