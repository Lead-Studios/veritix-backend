import { Test, TestingModule } from '@nestjs/testing';
import { SetllaController } from './setlla.controller';
import { SetllaService } from './setlla.service';

describe('SetllaController', () => {
  let controller: SetllaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetllaController],
      providers: [SetllaService],
    }).compile();

    controller = module.get<SetllaController>(SetllaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
