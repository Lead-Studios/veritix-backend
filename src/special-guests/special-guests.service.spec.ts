import { Test, TestingModule } from '@nestjs/testing';
import { SpecialGuestService } from './special-guests.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpecialGuest } from './entities/special-guest.entity';

// Mock repository function
const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('SpecialGuestsService', () => {
  let service: SpecialGuestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialGuestService,
        {
          provide: getRepositoryToken(SpecialGuest),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<SpecialGuestService>(SpecialGuestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
