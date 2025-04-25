/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from "@nestjs/common";
import { User } from "../entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { CreateUserDto } from "../dto/create-user.dto";
import { HashingProvider } from "../../auth/providers/hashing-provider";
import { GenerateTokenProvider } from "../../auth/providers/generate-token.provider";

@Injectable()
export class CreateUsersProvider {
  constructor(
    /*
     * Inject hashing provider
     */
    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
    /*
     * Inject user repository
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    /*
     * Inject generate token provider
     */
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}
  private readonly logger = new Logger(CreateUsersProvider.name);

  public async createUser(createUserDto: CreateUserDto): Promise<{ user: User; token: string }> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);
    let existingUser: User;

    try {
      existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error finding user: ${error.message}`);
        this.logger.error(
          `Error stack: ${error.stack}`,
        );
        throw new InternalServerErrorException(
          "An unwxpected error occurred while finding user.",
        );
      }
      this.logger.error("An unknown error occurred while finding user.");
      this.logger.error(
        `Error: ${JSON.stringify(error, null, 2)}`,
        { description: "An unknown error occurred" },
      );
      throw new InternalServerErrorException("An unknown error occurred.");
    }

    if (existingUser) {
      this.logger.warn(
        `User with email ${createUserDto.email} already exists.`);
      throw new ConflictException(
        "User already exists. Use a different email",
      );
    }
    const hashedPassword = await this.hashingProvider.hashPassword(
      createUserDto.password,
    );
    try {
      const newUser: DeepPartial<User> = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      const savedUser = await this.userRepository.save(newUser);

      // Generate token and send an email to the user for verification
      const verification_token = await this.generateTokenProvider.generateVerificationToken(savedUser);
      this.logger.log(`Verification token generated for user: ${JSON.stringify(verification_token, null, 2)}`);

      return { user: savedUser, token: verification_token };
    } catch (error: any) {
      this.logger.error(`Error saving user: ${error.message}`);
      throw error;
    }
  }
}
