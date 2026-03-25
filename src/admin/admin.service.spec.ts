import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { UserRole } from '../auth/common/enum/user-role-enum';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Partial<Repository<User>>>;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('prevents suspending another admin', async () => {
    userRepository.findOne?.mockResolvedValue({
      id: 2,
      role: UserRole.ADMIN,
      isSuspended: false,
      tokenVersion: 0,
    } as User);

    await expect(service.suspendUser(1, 2, 'fraud check')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('prevents demoting another admin', async () => {
    userRepository.findOne?.mockResolvedValue({
      id: 2,
      role: UserRole.ADMIN,
      isSuspended: false,
      tokenVersion: 0,
    } as User);

    await expect(
      service.updateUserRole(1, 2, UserRole.SUBSCRIBER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when user does not exist', async () => {
    userRepository.findOne?.mockResolvedValue(null);

    await expect(service.getUserDetails(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
