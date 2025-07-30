import { Test, TestingModule } from '@nestjs/testing';
import { WebauthnController } from './webauthn.controller';
import { WebauthnService } from './webauthn.service';

describe('WebauthnController', () => {
  let controller: WebauthnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebauthnController],
      providers: [WebauthnService],
    }).compile();

    controller = module.get<WebauthnController>(WebauthnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
