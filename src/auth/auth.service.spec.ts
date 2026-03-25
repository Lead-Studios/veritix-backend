import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserHelper } from './helper/user-helper';
import { JwtHelper } from './helper/jwt-helper';
import { UserMessages } from './helper/user-messages';
import { UserRole } from './common/enum/user-role-enum';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { sendEmail } from '../config/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto';

// ---------------------------------------------------------------------------
// Mock the email service so no real emails are sent
// ---------------------------------------------------------------------------
jest.mock('../config/email/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------
const futureDate = () => new Date(Date.now() + 10 * 60 * 1_000); // +10 min
const pastDate = () => new Date(Date.now() - 1); // already expired

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'user@example.com',
    fullName: 'Test User',
    password: 'hashed-pw',
    role: UserRole.SUBSCRIBER,
    isVerified: true,
    verificationCode: '1234',
    verificationCodeExpiresAt: futureDate(),
    passwordResetCode: '5678',
    passwordResetCodeExpiresAt: futureDate(),
    phone: null,
    avatarUrl: null,
    bio: null,
    country: null,
    stellarWalletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizedEvents: [],
    ...overrides,
  } as unknown as User;
}

const MOCK_TOKENS = { accessToken: 'access-jwt', refreshToken: 'refresh-jwt' };
const MOCK_USER_DTO = { id: 'user-uuid-1', email: 'user@example.com' };

// ---------------------------------------------------------------------------
// Module setup
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let service: AuthService;

  const mockRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserHelper = {
    isValidPassword: jest.fn(),
    hashPassword: jest.fn(),
    generateVerificationCode: jest.fn(),
    verifyPassword: jest.fn(),
    mapToResponseDto: jest.fn().mockReturnValue(MOCK_USER_DTO),
    formatUserResponse: jest.fn().mockReturnValue(MOCK_USER_DTO),
  };

  const mockJwtHelper = {
    generateTokens: jest.fn().mockReturnValue(MOCK_TOKENS),
    validateRefreshToken: jest.fn(),
    generateAccessToken: jest.fn().mockReturnValue('new-access-jwt'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: UserHelper, useValue: mockUserHelper },
        { provide: JwtHelper, useValue: mockJwtHelper },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // createUser
  // =========================================================================
  describe('createUser', () => {
    const dto: CreateUserDto = {
      email: 'new@example.com',
      fullName: 'New User',
      password: 'ValidPass1',
    };

    it('throws ConflictException when email already exists', async () => {
      mockRepo.findOne.mockResolvedValue(makeUser());

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(dto)).rejects.toThrow(
        UserMessages.EMAIL_ALREADY_EXIST,
      );
    });

    it('throws ConflictException when password is invalid', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(false);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(dto)).rejects.toThrow(
        UserMessages.IS_VALID_PASSWORD,
      );
    });

    it('creates user, saves to repo, and returns success message', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashed-pw');
      mockUserHelper.generateVerificationCode.mockReturnValue('1234');
      mockRepo.create.mockReturnValue({ ...dto, password: 'hashed-pw' });
      mockRepo.save.mockResolvedValue({});

      const result = await service.createUser(dto);

      expect(result).toEqual({
        message: UserMessages.USER_CREATED_SUCCESSFULLY,
      });
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('sends verification email with correct OTP digits', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashed-pw');
      mockUserHelper.generateVerificationCode.mockReturnValue('4321');
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue({});

      await service.createUser(dto);

      expect(sendEmail).toHaveBeenCalledWith(
        dto.email,
        'Verify Your Account',
        'verification-email',
        {
          fullName: dto.fullName,
          otp1: '4',
          otp2: '3',
          otp3: '2',
          otp4: '1',
        },
      );
    });

    it('assigns SUBSCRIBER role to new users', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashed-pw');
      mockUserHelper.generateVerificationCode.mockReturnValue('0000');
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockResolvedValue({});

      await service.createUser(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.SUBSCRIBER }),
      );
    });
  });

  // =========================================================================
  // verifyOtp
  // =========================================================================
  describe('verifyOtp', () => {
    const dto: VerifyOtpDto = { email: 'user@example.com', otp: '1234' };

    it('throws BadRequestException when email is missing', async () => {
      await expect(service.verifyOtp({ ...dto, email: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when OTP is missing', async () => {
      await expect(service.verifyOtp({ ...dto, otp: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UserMessages.USER_NOT_FOUND,
      );
    });

    it('throws UnauthorizedException when OTP does not match', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({ verificationCode: '9999' }),
      );

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UserMessages.INVALID_OTP,
      );
    });

    it('throws UnauthorizedException when OTP is expired', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({
          verificationCode: '1234',
          verificationCodeExpiresAt: pastDate(),
        }),
      );

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UserMessages.OTP_EXPIRED,
      );
    });

    it('throws UnauthorizedException when verificationCodeExpiresAt is null', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({
          verificationCode: '1234',
          verificationCodeExpiresAt: undefined,
        }),
      );

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('marks user as verified, clears OTP, saves, and returns tokens', async () => {
      const user = makeUser({
        verificationCode: '1234',
        verificationCodeExpiresAt: futureDate(),
        isVerified: false,
      });
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue(user);

      const result = await service.verifyOtp(dto);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true, verificationCode: '' }),
      );
      expect(result).toEqual({
        message: UserMessages.VERIFY_OTP_SUCCESS,
        user: MOCK_USER_DTO,
        tokens: MOCK_TOKENS,
      });
    });

    it('calls jwtHelper.generateTokens with the saved user', async () => {
      const user = makeUser({
        verificationCode: '1234',
        verificationCodeExpiresAt: futureDate(),
      });
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue(user);

      await service.verifyOtp(dto);

      expect(mockJwtHelper.generateTokens).toHaveBeenCalledWith(user);
    });
  });

  // =========================================================================
  // login
  // =========================================================================
  describe('login', () => {
    const dto: LoginUserDto = {
      email: 'user@example.com',
      password: 'ValidPass1',
    };

    it('throws UnauthorizedException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        UserMessages.INVALID_CREDENTIALS,
      );
    });

    it('throws UnauthorizedException when password does not match', async () => {
      mockRepo.findOne.mockResolvedValue(makeUser());
      mockUserHelper.verifyPassword.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        UserMessages.INVALID_CREDENTIALS,
      );
    });

    it('resends OTP and returns EMAIL_NOT_VERIFIED when user is unverified', async () => {
      const unverifiedUser = makeUser({ isVerified: false });
      mockRepo.findOne
        .mockResolvedValueOnce(unverifiedUser) // login query
        .mockResolvedValueOnce(unverifiedUser); // resendVerificationOtp query
      mockUserHelper.verifyPassword.mockResolvedValue(true);
      mockUserHelper.generateVerificationCode.mockReturnValue('0000');
      mockRepo.save.mockResolvedValue(unverifiedUser);

      const result = await service.login(dto);

      expect(result).toEqual({
        message: UserMessages.EMAIL_NOT_VERIFIED,
        user: MOCK_USER_DTO,
      });
      expect(sendEmail).toHaveBeenCalledWith(
        unverifiedUser.email,
        'Verify Your Account',
        'verification-email',
        expect.any(Object),
      );
    });

    it('returns user and tokens on successful login', async () => {
      const verifiedUser = makeUser({ isVerified: true });
      mockRepo.findOne.mockResolvedValue(verifiedUser);
      mockUserHelper.verifyPassword.mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({
        user: MOCK_USER_DTO,
        tokens: MOCK_TOKENS,
      });
      expect(mockJwtHelper.generateTokens).toHaveBeenCalledWith(verifiedUser);
    });
  });

  // =========================================================================
  // refreshToken
  // =========================================================================
  describe('refreshToken', () => {
    it('throws UnauthorizedException when refresh token is invalid', async () => {
      mockJwtHelper.validateRefreshToken.mockImplementation(() => {
        throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when no user is found for the token payload', async () => {
      mockJwtHelper.validateRefreshToken.mockReturnValue('user-uuid-1');
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UserMessages.INVALID_REFRESH_TOKEN,
      );
    });

    it('returns a new access token for a valid refresh token', async () => {
      const user = makeUser();
      mockJwtHelper.validateRefreshToken.mockReturnValue('user-uuid-1');
      mockRepo.findOne.mockResolvedValue(user);

      const result = await service.refreshToken('valid-refresh');

      expect(result).toEqual({ accessToken: 'new-access-jwt' });
      expect(mockJwtHelper.generateAccessToken).toHaveBeenCalledWith(user);
    });
  });

  // =========================================================================
  // requestResetPasswordOtp
  // =========================================================================
  describe('requestResetPasswordOtp', () => {
    const dto: SendPasswordResetOtpDto = { email: 'user@example.com' };

    it('throws BadRequestException when email is missing', async () => {
      await expect(
        service.requestResetPasswordOtp({ email: '' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestResetPasswordOtp({ email: '' }),
      ).rejects.toThrow(UserMessages.EMAIL_REQUIRED);
    });

    it('throws NotFoundException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.requestResetPasswordOtp(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.requestResetPasswordOtp(dto)).rejects.toThrow(
        UserMessages.USER_NOT_FOUND,
      );
    });

    it('generates OTP, saves it, and sends reset email', async () => {
      const user = makeUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue('9012');
      mockRepo.save.mockResolvedValue(user);

      const result = await service.requestResetPasswordOtp(dto);

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordResetCode: '9012' }),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        user.email,
        'Password Reset OTP',
        'reset-password-email',
        {
          fullName: user.fullName,
          otp1: '9',
          otp2: '0',
          otp3: '1',
          otp4: '2',
        },
      );
    });
  });

  // =========================================================================
  // resetPassword
  // =========================================================================
  describe('resetPassword', () => {
    const validDto: ResetPasswordDto = {
      otp: '5678',
      newPassword: 'NewPass1!',
      confirmNewPassword: 'NewPass1!',
    };

    it('throws NotFoundException when no user matches the OTP', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.resetPassword(validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resetPassword(validDto)).rejects.toThrow(
        UserMessages.USER_NOT_FOUND,
      );
    });

    it('throws UnauthorizedException when OTP has expired', async () => {
      mockRepo.findOneBy.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: pastDate(),
        }),
      );

      await expect(service.resetPassword(validDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword(validDto)).rejects.toThrow(
        UserMessages.OTP_EXPIRED,
      );
    });

    it('throws UnauthorizedException when passwordResetCodeExpiresAt is null', async () => {
      mockRepo.findOneBy.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: undefined,
        }),
      );

      await expect(service.resetPassword(validDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException when newPassword is invalid', async () => {
      mockRepo.findOneBy.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: futureDate(),
        }),
      );
      mockUserHelper.isValidPassword.mockReturnValue(false);

      await expect(service.resetPassword(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(validDto)).rejects.toThrow(
        UserMessages.IS_VALID_PASSWORD,
      );
    });

    it('throws BadRequestException when passwords do not match', async () => {
      mockRepo.findOneBy.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: futureDate(),
        }),
      );
      mockUserHelper.isValidPassword.mockReturnValue(true);

      await expect(
        service.resetPassword({
          ...validDto,
          confirmNewPassword: 'Different1!',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({
          ...validDto,
          confirmNewPassword: 'Different1!',
        }),
      ).rejects.toThrow(UserMessages.PASSWORDS_DO_NOT_MATCH);
    });

    it('hashes new password, clears reset code, saves, and returns success', async () => {
      const user = makeUser({
        passwordResetCode: '5678',
        passwordResetCodeExpiresAt: futureDate(),
      });
      mockRepo.findOneBy.mockResolvedValue(user);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('new-hashed-pw');
      mockRepo.save.mockResolvedValue(user);

      const result = await service.resetPassword(validDto);

      expect(result).toEqual({
        message: UserMessages.PASSWORDS_RESET_SUCCESSFUL,
      });
      expect(mockUserHelper.hashPassword).toHaveBeenCalledWith(
        validDto.newPassword,
      );
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'new-hashed-pw',
          passwordResetCode: undefined,
          passwordResetCodeExpiresAt: undefined,
        }),
      );
    });
  });

  // =========================================================================
  // createAdminUser
  // =========================================================================
  describe('createAdminUser', () => {
    const dto: CreateUserDto = {
      email: 'admin@example.com',
      fullName: 'Admin User',
      password: 'AdminPass1',
    };

    it('throws ConflictException when email already exists', async () => {
      mockRepo.findOne.mockResolvedValue(makeUser());

      await expect(service.createAdminUser(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when password is invalid', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(false);

      await expect(service.createAdminUser(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates an ADMIN role user and returns success message', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashed-pw');
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockResolvedValue({});

      const result = await service.createAdminUser(dto);

      expect(result).toEqual({
        message: UserMessages.USER_CREATED_SUCCESSFULLY,
      });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
    });

    it('does NOT send a verification email for admin users', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashed-pw');
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue({});

      await service.createAdminUser(dto);

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // resendVerificationOtp
  // =========================================================================
  describe('resendVerificationOtp', () => {
    it('throws when email is empty', async () => {
      // The method wraps in try/catch and re-throws InternalServerErrorException
      await expect(service.resendVerificationOtp('')).rejects.toThrow();
    });

    it('throws when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resendVerificationOtp('missing@example.com'),
      ).rejects.toThrow();
    });

    it('generates new OTP, saves, sends email, and returns OTP_SENT', async () => {
      const user = makeUser({ isVerified: false });
      mockRepo.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue('7777');
      mockRepo.save.mockResolvedValue(user);

      const result = await service.resendVerificationOtp(user.email);

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(sendEmail).toHaveBeenCalledWith(
        user.email,
        'Verify Your Account',
        'verification-email',
        { fullName: user.fullName, otp1: '7', otp2: '7', otp3: '7', otp4: '7' },
      );
    });
  });

  // =========================================================================
  // verifyResetPasswordOtp
  // =========================================================================
  describe('verifyResetPasswordOtp', () => {
    const dto: VerifyOtpDto = { email: 'user@example.com', otp: '5678' };

    it('throws BadRequestException when email is missing', async () => {
      await expect(
        service.verifyResetPasswordOtp({ ...dto, email: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when OTP is missing', async () => {
      await expect(
        service.verifyResetPasswordOtp({ ...dto, otp: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyResetPasswordOtp(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnauthorizedException when OTP does not match', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({ passwordResetCode: 'XXXX' }),
      );
      await expect(service.verifyResetPasswordOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyResetPasswordOtp(dto)).rejects.toThrow(
        UserMessages.INVALID_OTP,
      );
    });

    it('throws UnauthorizedException when OTP is expired', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: pastDate(),
        }),
      );
      await expect(service.verifyResetPasswordOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyResetPasswordOtp(dto)).rejects.toThrow(
        UserMessages.OTP_EXPIRED,
      );
    });

    it('returns OTP_VERIFIED on success', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeUser({
          passwordResetCode: '5678',
          passwordResetCodeExpiresAt: futureDate(),
        }),
      );
      mockRepo.save.mockResolvedValue({});

      const result = await service.verifyResetPasswordOtp(dto);
      expect(result).toEqual({ message: UserMessages.OTP_VERIFIED });
    });
  });

  // =========================================================================
  // retrieveUserById
  // =========================================================================
  describe('retrieveUserById', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.retrieveUserById(99)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns mapped user DTO when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeUser());
      const result = await service.retrieveUserById(1);
      expect(result).toBe(MOCK_USER_DTO);
      expect(mockUserHelper.mapToResponseDto).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateProfile
  // =========================================================================
  describe('updateProfile', () => {
    it('throws NotFoundException when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile('bad-id', { bio: 'hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates only allowed profile fields and returns mapped DTO', async () => {
      const user = makeUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue({ ...user, bio: 'New bio' });

      const result = await service.updateProfile(user.id, {
        bio: 'New bio',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'New bio',
          avatarUrl: 'https://example.com/avatar.png',
        }),
      );
      expect(result).toBe(MOCK_USER_DTO);
    });

    it('does not overwrite password or role via updateProfile', async () => {
      const user = makeUser({ role: UserRole.SUBSCRIBER });
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockImplementation((u) => Promise.resolve(u));

      await service.updateProfile(user.id, {
        // TypeScript won't allow role here but we test the runtime guard
        ...({ role: UserRole.ADMIN } as any),
        bio: 'safe update',
      });

      // Role should remain unchanged since it is not in allowedFields
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.SUBSCRIBER }),
      );
    });
  });

  // =========================================================================
  // resendResetPasswordVerificationOtp
  // =========================================================================
  describe('resendResetPasswordVerificationOtp', () => {
    it('throws when email is missing', async () => {
      await expect(
        service.resendResetPasswordVerificationOtp({ email: '' }),
      ).rejects.toThrow();
    });

    it('throws when user is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resendResetPasswordVerificationOtp({
          email: 'nobody@example.com',
        }),
      ).rejects.toThrow();
    });

    it('sends reset password email and returns OTP_SENT', async () => {
      const user = makeUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue('3456');
      mockRepo.save.mockResolvedValue(user);

      const result = await service.resendResetPasswordVerificationOtp({
        email: user.email,
      });

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(sendEmail).toHaveBeenCalledWith(
        user.email,
        'Password Reset OTP',
        'reset-password-email',
        { fullName: user.fullName, otp1: '3', otp2: '4', otp3: '5', otp4: '6' },
      );
    });
  });
});
