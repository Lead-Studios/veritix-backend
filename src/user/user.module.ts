import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EmailService } from './services/email.service';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MulterModule.register()],
  providers: [UserService, EmailService, ProfileService],
  controllers: [UserController, ProfileController],
  exports: [UserService, EmailService, ProfileService],
})
export class UserModule {}
