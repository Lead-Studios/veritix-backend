import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditAction } from './entities/admin-audit-log.entity';

describe('AdminController', () => {
  let controller: AdminController;
  const adminServiceMock = {
    getStats: jest.fn(),
    getAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminServiceMock }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes pagination and action filter to getAuditLog', async () => {
    adminServiceMock.getAuditLog.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    await controller.getAuditLog('1', '50', AdminAuditAction.MANUAL_REFUND);

    expect(adminServiceMock.getAuditLog).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      action: AdminAuditAction.MANUAL_REFUND,
    });
  });
});
