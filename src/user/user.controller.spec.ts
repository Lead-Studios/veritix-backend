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
            findAll: jest.fn(() => Promise.resolve([])),
            create: jest.fn(() =>
              Promise.resolve({ id: '1', email: 'test@example.com' }),
            ),
            update: jest.fn(() => Promise.resolve({ id: '1', role: 'admin' })),
            remove: jest.fn(() => Promise.resolve(undefined)),
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should create a user', async () => {
    const dto = { email: 'test@example.com', password: 'secret123' };
    expect(await controller.create(dto)).toEqual({
      id: '1',
      email: 'test@example.com',
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should update a user', async () => {
    const dto = { role: 'admin' };
    expect(await controller.update('1', dto)).toEqual({
      id: '1',
      role: 'admin',
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('should delete a user', async () => {
    expect(await controller.remove('1')).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
