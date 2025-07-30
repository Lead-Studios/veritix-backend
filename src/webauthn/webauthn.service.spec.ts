import { Test, TestingModule } from '@nestjs/testing';
import { WebauthnService } from './webauthn.service';

describe('WebauthnService', () => {
  let service: WebauthnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebauthnService],
    }).compile();

    service = module.get<WebauthnService>(WebauthnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
