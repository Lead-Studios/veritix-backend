import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './services/permission.service';
import { PermissionsController } from './controllers/permission.controller';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';

@Module({
  imports: [
    TenantRepositoryModule.forFeature([Permission, Role, RolePermission]),
  ],
  providers: [RolesGuard, PermissionsGuard, PermissionsService],
  controllers: [PermissionsController],
  exports: [RolesGuard, PermissionsGuard, PermissionsService],
})
