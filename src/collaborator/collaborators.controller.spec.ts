import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CollaboratorService } from './collaborators.service';
import { CollaboratorRole } from './dto/create-collaborator.dto';

describe('CollaboratorService', () => {
  let service: CollaboratorService;
  let repository: Repository<Collaborator>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorService,
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CollaboratorService>(CollaboratorService);
    repository = module.get<Repository<Collaborator>>(getRepositoryToken(Collaborator));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new collaborator', async () => {
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/image.jpg',
        conferenceId: '123',
        eventId: '456',
        role: CollaboratorRole.VIEWER,
      };
      
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(2); // 2 existing collaborators
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockResolvedValue({ id: '1', ...createDto });
      
      const result = await service.create(createDto);
      
      expect(result).toEqual({ id: '1', ...createDto });
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.count).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });
    
    it('should throw BadRequestException if email already exists for conference', async () => {
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/image.jpg',
        conferenceId: '123',
        eventId: '456',
        role: CollaboratorRole.VIEWER,
      };
      
      mockRepository.findOne.mockResolvedValue({ id: '1', ...createDto });
      
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
    
    it('should throw BadRequestException if conference already has 5 collaborators', async () => {
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/image.jpg',
        conferenceId: '123',
        eventId: '456',
        role: CollaboratorRole.VIEWER,
      };
      
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(5); // 5 existing collaborators
      
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a collaborator if found', async () => {
      const collaborator = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/image.jpg',
        conferenceId: '123',
        eventId: '456',
        role: CollaboratorRole.VIEWER,
      };
      
      mockRepository.findOne.mockResolvedValue(collaborator);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(collaborator);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
    
    it('should throw NotFoundException if collaborator not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
});