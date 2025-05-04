import { Test, TestingModule } from '@nestjs/testing';
import { ConferencePosterManagementController } from './conference-poster-management.controller';
import { ConferencePosterManagementService } from './conference-poster-management.service';

describe('ConferencePosterManagementController', () => {
  let controller: ConferencePosterManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferencePosterManagementController],
      providers: [ConferencePosterManagementService],
    }).compile();

    controller = module.get<ConferencePosterManagementController>(ConferencePosterManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
