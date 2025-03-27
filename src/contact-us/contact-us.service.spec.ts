import { Test, TestingModule } from '@nestjs/testing';
import { ContactUsService } from './contact-us.service';

describe('ContactUsService', () => {
  let service: ContactUsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactUsService],
    }).compile();

    service = module.get<ContactUsService>(ContactUsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
