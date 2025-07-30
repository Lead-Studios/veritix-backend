import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permission.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { NotFoundException } from '@nestjs/common';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repository: Repository<Permission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useClass: Repository, // Mock the repository
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    repository = module.get<Repository<Permission>>(getRepositoryToken(Permission));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new permission', async () => {
      const createPermissionDto = { name: 'test:permission', description: 'Test Description' };
      const expectedPermission = { id: '1', ...createPermissionDto };

      jest.spyOn(repository, 'create').mockReturnValue(expectedPermission as Permission);
      jest.spyOn(repository, 'save').mockResolvedValue(expectedPermission as Permission);

      const result = await service.create(createPermissionDto);
      expect(result).toEqual(expectedPermission);
      expect(repository.create).toHaveBeenCalledWith(createPermissionDto);
      expect(repository.save).toHaveBeenCalledWith(expectedPermission);
    });
  });

  describe('findAll', () => {
    it('should return an array of permissions', async () => {
      const permissions = [{ id: '1', name: 'perm1', description: 'Desc1' }];
      jest.spyOn(repository, 'find').mockResolvedValue(permissions as Permission[]);

      const result = await service.findAll();
      expect(result).toEqual(permissions);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single permission', async () => {
      const permission = { id: '1', name: 'perm1', description: 'Desc1' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(permission as Permission);

      const result = await service.findOne('1');
      expect(result).toEqual(permission);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if permission not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      const existingPermission = { id: '1', name: 'old:name', description: 'Old Desc' };
      const updatePermissionDto = { name: 'new:name' };
      const updatedPermission = { ...existingPermission, ...updatePermissionDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingPermission as Permission);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedPermission as Permission);

      const result = await service.update('1', updatePermissionDto);
      expect(result).toEqual(updatedPermission);
      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(repository.save).toHaveBeenCalledWith(updatedPermission);
    });
  });

  describe('remove', () => {
    it('should remove a permission', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 } as any);
      await expect(service.remove('1')).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if permission not found for removal', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0 } as any);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
