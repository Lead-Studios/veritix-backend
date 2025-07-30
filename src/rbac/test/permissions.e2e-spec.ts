import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { AuthService } from '../../token-rotation/auth/auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Permissions (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let permissionRepository: Repository<Permission>;

  let adminToken: string;
  let userToken: string;
  let organizerToken: string;

  const mockAdminUser = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    password: 'password',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
  };

  const mockOrganizerUser = {
    id: 'organizer-uuid',
    email: 'organizer@example.com',
    password: 'password',
    firstName: 'Organizer',
    lastName: 'User',
    isActive: true,
  };

  const mockRegularUser = {
    id: 'user-uuid',
    email: 'user@example.com',
    password: 'password',
    firstName: 'Regular',
    lastName: 'User',
    isActive: true,
  };

  const createEventPermission = {
    id: 'create-event-perm-uuid',
    name: 'can:create_event',
    description: 'Allows creating new events',
  };

  const viewSalesPermission = {
    id: 'view-sales-perm-uuid',
    name: 'can:view_sales',
    description: 'Allows viewing sales data',
  };

  const adminRole = {
    id: 'admin-role-uuid',
    name: 'admin',
    description: 'Administrator role',
    rolePermissions: [],
  };

  const organizerRole = {
    id: 'organizer-role-uuid',
    name: 'organizer',
    description: 'Organizer role',
    rolePermissions: [],
  };

  const userRole = {
    id: 'user-role-uuid',
    name: 'user',
    description: 'Regular user role',
    rolePermissions: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepository = moduleFixture.get<Repository<Permission>>(getRepositoryToken(Permission));

    // Mock repository methods
    jest.spyOn(userRepository, 'findOne').mockImplementation(async ({ where }: any) => {
      if (where.email === mockAdminUser.email) return { ...mockAdminUser, roles: [adminRole] } as User;
      if (where.email === mockOrganizerUser.email) return { ...mockOrganizerUser, roles: [organizerRole] } as User;
      if (where.email === mockRegularUser.email) return { ...mockRegularUser, roles: [userRole] } as User;
      return null;
    });

    jest.spyOn(userRepository, 'save').mockImplementation(async (user: User) => user);
    jest.spyOn(roleRepository, 'findOne').mockImplementation(async ({ where }: any) => {
      if (where.name === adminRole.name) return { ...adminRole, rolePermissions: [{ permission: createEventPermission }, { permission: viewSalesPermission }] } as Role;
      if (where.name === organizerRole.name) return { ...organizerRole, rolePermissions: [{ permission: createEventPermission }] } as Role;
      if (where.name === userRole.name) return { ...userRole, rolePermissions: [] } as Role;
      return null;
    });
    jest.spyOn(permissionRepository, 'findOne').mockImplementation(async ({ where }: any) => {
      if (where.name === createEventPermission.name) return createEventPermission as Permission;
      if (where.name === viewSalesPermission.name) return viewSalesPermission as Permission;
      return null;
    });

    // Generate tokens
    adminToken = (await authService.login(mockAdminUser.email, mockAdminUser.password)).accessToken;
    organizerToken = (await authService.login(mockOrganizerUser.email, mockOrganizerUser.password)).accessToken;
    userToken = (await authService.login(mockRegularUser.email, mockRegularUser.password)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/events (POST) - Admin should be able to create an event', async () => {
    return request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Event',
        description: 'Description of new event',
        location: 'Venue',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      })
      .expect(201);
  });

  it('/events (POST) - Organizer should be able to create an event', async () => {
    return request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'Organizer Event',
        description: 'Description of organizer event',
        location: 'Hall',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      })
      .expect(201);
  });

  it('/events (POST) - Regular user should NOT be able to create an event', async () => {
    return request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Event',
        description: 'Description of user event',
        location: 'Park',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      })
      .expect(403); // Forbidden
  });

  it('/permissions (GET) - Admin should be able to view permissions', async () => {
    return request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('/permissions (GET) - Organizer should NOT be able to view permissions', async () => {
    return request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(403); // Forbidden
  });

  it('/permissions (GET) - Regular user should NOT be able to view permissions', async () => {
    return request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403); // Forbidden
  });
});
