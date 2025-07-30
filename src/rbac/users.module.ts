
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { RbacModule } from '../rbac/rbac.module';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [TenantRepositoryModule.forFeature([User]), RbacModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
