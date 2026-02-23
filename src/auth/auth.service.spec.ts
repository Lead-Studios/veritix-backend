import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserHelper } from './helper/user-helper';
import { JwtHelper } from './helper/jwt-helper';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UserMessages } from './helper/user-messages';
import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { sendEmail } from '../config/email/email.service';

jest.mock('../config/email/email.service', () => ({
  sendEmail: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let userHelper: UserHelper;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockUserHelper = {
    isValidPassword: jest.fn(),
    hashPassword: jest.fn(),
    generateVerificationCode: jest.fn(),
    formatUserResponse: jest.fn(),
    verifyPassword: jest.fn(),
  };

  const mockJwtHelper = {
    generateTokens: jest.fn(),
    validateRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UserHelper,
          useValue: mockUserHelper,
        },
        {
          provide: JwtHelper,
          useValue: mockJwtHelper,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userHelper = module.get<UserHelper>(UserHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user and send a verification email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123',
      };
      const verificationCode = '1234';

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserHelper.isValidPassword.mockReturnValue(true);
      mockUserHelper.hashPassword.mockResolvedValue('hashedPassword');
      mockUserHelper.generateVerificationCode.mockReturnValue(verificationCode);
      mockUserRepository.create.mockReturnValue(createUserDto);
      mockUserRepository.save.mockResolvedValue(createUserDto);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual({ message: UserMessages.USER_CREATED_SUCCESSFULLY });
      expect(sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Verify Your Account',
        'verification-email',
        {
          fullName: createUserDto.fullName,
          otp1: '1',
          otp2: '2',
          otp3: '3',
          otp4: '4',
        },
      );
    });
  });

  describe('resendVerificationOtp', () => {
    it('should resend verification OTP and send an email', async () => {
      const email = 'test@example.com';
      const user = { email, fullName: 'Test User' };
      const verificationCode = '5678';

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue(verificationCode);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.resendVerificationOtp(email);

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(sendEmail).toHaveBeenCalledWith(
        email,
        'Verify Your Account',
        'verification-email',
        {
          fullName: user.fullName,
          otp1: '5',
          otp2: '6',
          otp3: '7',
          otp4: '8',
        },
      );
    });
  });

  describe('requestResetPasswordOtp', () => {
    it('should request reset password OTP and send an email', async () => {
      const dto: SendPasswordResetOtpDto = { email: 'test@example.com' };
      const user = { email: dto.email, fullName: 'Test User' };
      const otp = '9012';

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue(otp);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.requestResetPasswordOtp(dto);

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(sendEmail).toHaveBeenCalledWith(
        dto.email,
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

  describe('resendResetPasswordVerificationOtp', () => {
    it('should resend reset password OTP and send an email', async () => {
      const dto: ResendOtpDto = { email: 'test@example.com' };
      const user = { email: dto.email, fullName: 'Test User' };
      const otp = '3456';

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserHelper.generateVerificationCode.mockReturnValue(otp);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.resendResetPasswordVerificationOtp(dto);

      expect(result).toEqual({ message: UserMessages.OTP_SENT });
      expect(sendEmail).toHaveBeenCalledWith(
        dto.email,
        'Password Reset OTP',
        'reset-password-email',
        {
          fullName: user.fullName,
          otp1: '3',
          otp2: '4',
          otp3: '5',
          otp4: '6',
        },
      );
    });
  });
});
