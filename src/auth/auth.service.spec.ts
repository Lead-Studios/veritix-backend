import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService, DeleteAccountInput } from './auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;

  const mockUserId = 'user-123';
  const mockUserPassword = 'hashed_password_123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    fullName: 'Test User',
    password: mockUserPassword,
    role: UserRole.SUBSCRIBER,
    isVerified: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteAccount', () => {
    describe('success cases', () => {
      it('should delete account successfully with correct password', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockUserId },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(
          'correct-password',
          mockUserPassword,
        );
        expect(userRepository.update).toHaveBeenCalledWith(mockUserId, {
          email: `deleted_${mockUserId}@veritix.io`,
          fullName: 'Deleted User',
          deletedAt: expect.any(Date),
          tokenVersion: mockUser.tokenVersion + 1,
        });
      });

      it('should increment tokenVersion on account deletion', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        const userWithVersion3 = { ...mockUser, tokenVersion: 3 };
        userRepository.findOne.mockResolvedValue(userWithVersion3);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            tokenVersion: 4,
          }),
        );
      });

      it('should anonymise PII correctly on deletion', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        const updateCall = userRepository.update.mock.calls[0];
        expect(updateCall[1].email).toBe(`deleted_${mockUserId}@veritix.io`);
        expect(updateCall[1].fullName).toBe('Deleted User');
        expect(updateCall[1].deletedAt).not.toBeNull();
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundException if user does not exist', async () => {
        const deleteInput: DeleteAccountInput = { password: 'any-password' };
        userRepository.findOne.mockResolvedValue(null);

        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow('User not found');
      });

      it('should throw ForbiddenException when password is incorrect', async () => {
        const deleteInput: DeleteAccountInput = { password: 'wrong-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow('Invalid password');
      });

      it('should not call update if password verification fails', async () => {
        const deleteInput: DeleteAccountInput = { password: 'wrong-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        try {
          await service.deleteAccount(mockUserId, deleteInput);
        } catch {
          // Expected to throw
        }

        expect(userRepository.update).not.toHaveBeenCalled();
      });

      it('should not call update if user is not found', async () => {
        const deleteInput: DeleteAccountInput = { password: 'any-password' };
        userRepository.findOne.mockResolvedValue(null);

        try {
          await service.deleteAccount(mockUserId, deleteInput);
        } catch {
          // Expected to throw
        }

        expect(userRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle users with very high tokenVersion', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        const userWithHighVersion = { ...mockUser, tokenVersion: 999999 };
        userRepository.findOne.mockResolvedValue(userWithHighVersion);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            tokenVersion: 1000000,
          }),
        );
      });

      it('should set proper deletedAt timestamp', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const beforeTime = new Date();

        await service.deleteAccount(mockUserId, deleteInput);

        const afterTime = new Date();
        const updateCall = userRepository.update.mock.calls[0];
        const deletedAtTime = updateCall[1].deletedAt;

        expect(deletedAtTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(deletedAtTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });

      it('should handle password comparison with special characters', async () => {
        const deleteInput: DeleteAccountInput = { password: 'p@ssw0rd!#$%' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(bcrypt.compare).toHaveBeenCalledWith(
          'p@ssw0rd!#$%',
          mockUserPassword,
        );
      });

      it('should handle bcrypt.compare throwing an error', async () => {
        const deleteInput: DeleteAccountInput = { password: 'any-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockRejectedValue(
          new Error('Bcrypt error'),
        );

        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow('Bcrypt error');
      });

      it('should handle repository update errors gracefully', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        userRepository.update.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          service.deleteAccount(mockUserId, deleteInput),
        ).rejects.toThrow('Database connection failed');
      });

      it('should work with already deleted users (null deletedAt becomes set)', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        const alreadyDeletedUser = { ...mockUser, deletedAt: null };
        userRepository.findOne.mockResolvedValue(alreadyDeletedUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        );
      });
    });

    describe('security considerations', () => {
      it('should use bcrypt.compare for password verification (not equality)', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(bcrypt.compare).toHaveBeenCalled();
      });

      it('should not expose password in error messages', async () => {
        const deleteInput: DeleteAccountInput = { password: 'sensitive-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        try {
          await service.deleteAccount(mockUserId, deleteInput);
        } catch (error) {
          expect((error as Error).message).not.toContain(
            'sensitive-password',
          );
        }
      });

      it('should anonymise email with user ID for traceability', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        const customUserId = 'custom-user-id-456';
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(customUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledWith(
          customUserId,
          expect.objectContaining({
            email: `deleted_${customUserId}@veritix.io`,
          }),
        );
      });
    });

    describe('repository interactions', () => {
      it('should query user before updating', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.findOne).toHaveBeenCalledBefore(
          userRepository.update as any,
        );
      });

      it('should only call update once', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(mockUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledTimes(1);
      });

      it('should pass correct user ID to update', async () => {
        const deleteInput: DeleteAccountInput = { password: 'correct-password' };
        const customUserId = 'another-user-id';
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.deleteAccount(customUserId, deleteInput);

        expect(userRepository.update).toHaveBeenCalledWith(
          customUserId,
          expect.any(Object),
        );
      });
    });

    describe('input validation', () => {
      it('should accept valid DeleteAccountInput objects', async () => {
        const validInput: DeleteAccountInput = { password: 'valid-password' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(
          service.deleteAccount(mockUserId, validInput),
        ).resolves.not.toThrow();
      });

      it('should handle empty password string', async () => {
        const emptyPasswordInput: DeleteAccountInput = { password: '' };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.deleteAccount(mockUserId, emptyPasswordInput),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should handle very long password strings', async () => {
        const longPassword = 'a'.repeat(1000);
        const longPasswordInput: DeleteAccountInput = { password: longPassword };
        userRepository.findOne.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(
          service.deleteAccount(mockUserId, longPasswordInput),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have deleteAccount method', () => {
      expect(service.deleteAccount).toBeDefined();
      expect(typeof service.deleteAccount).toBe('function');
    });

    it('should inject UserRepository', () => {
      expect(userRepository).toBeDefined();
    });
  });
});
