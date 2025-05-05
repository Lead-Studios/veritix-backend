import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ConferenceSponsorsService } from './conference-sponsors.service';
import { ConferenceSponsor } from './entities/conference-sponsor.entity';
import { Conference, ConferenceVisibility } from './../conference/entities/conference.entity';
import { CreateConferenceSponsorDto } from './dto/create-conference-sponsor.dto';
import { UpdateConferenceSponsorDto } from './dto/update-conference-sponsor.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../src/common/enums/users-roles.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`),
  sep: '/',
}));

describe('ConferenceSponsorsService', () => {
  let service: ConferenceSponsorsService;
  let sponsorRepository: Repository<ConferenceSponsor>;
  let conferenceRepository: Repository<Conference>;

  const mockFile = {
    fieldname: 'brandImage',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test'),
    size: 955578,
    filename: 'test-123456.jpg',
    path: '/tmp/uploads/conference-sponsors/test-123456.jpg',
  } as Express.Multer.File;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.Organizer,
    conferences: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockConference: Conference = {
    id: 'conf-1',
    name: 'Test Conference',
    description: 'Test description',
    startDate: new Date(),
    endDate: new Date(),
    location: 'Test location',
    organizerId: 'user-1',
    visibility: ConferenceVisibility.PUBLIC,
    organizer: mockUser,
    speakers: [],
    sponsors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as  Conference;

  const mockConferenceSponsor: ConferenceSponsor = {
    id: 'sponsor-1',
    brandName: 'Test Sponsor',
    brandWebsite: 'https://testsponsor.com',
    brandImage: 'uploads/conference-sponsors/test-123456.jpg',
    conferenceId: 'conf-1',
    conference: mockConference,
    facebook: 'testsponsor',
    twitter: 'testsponsor',
    instagram: 'testsponsor',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ConferenceSponsor;

  const mockCreateSponsorDto: CreateConferenceSponsorDto = {
    brandName: 'Test Sponsor',
    brandWebsite: 'https://testsponsor.com',
    conferenceId: 'conf-1',
    facebook: 'testsponsor',
    twitter: 'testsponsor',
    instagram: 'testsponsor',
  };

  const mockUpdateSponsorDto: UpdateConferenceSponsorDto = {
    brandName: 'Updated Sponsor',
    brandWebsite: 'https://updatedsponsor.com',
  };

  const mockSponsorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockConferenceRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConferenceSponsorsService,
        {
          provide: getRepositoryToken(ConferenceSponsor),
          useValue: mockSponsorRepository,
        },
        {
          provide: getRepositoryToken(Conference),
          useValue: mockConferenceRepository,
        },
      ],
    }).compile();

    service = module.get<ConferenceSponsorsService>(ConferenceSponsorsService);
    sponsorRepository = module.get<Repository<ConferenceSponsor>>(getRepositoryToken(ConferenceSponsor));
    conferenceRepository = module.get<Repository<Conference>>(getRepositoryToken(Conference));

    jest.clearAllMocks();
    
    // Mock fs.existsSync for the directory check in the constructor
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new conference sponsor', async () => {
      mockConferenceRepository.findOne.mockResolvedValue(mockConference);
      mockSponsorRepository.create.mockReturnValue(mockConferenceSponsor);
      mockSponsorRepository.save.mockResolvedValue(mockConferenceSponsor);
      
      // Mock private method
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(true);
      jest.spyOn<any, any>(service, 'getRelativePath').mockReturnValue('uploads/conference-sponsors/test-123456.jpg');

      const result = await service.create(mockCreateSponsorDto, mockFile, mockUser);

      expect(result).toEqual(mockConferenceSponsor);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateSponsorDto.conferenceId },
      });
      expect(mockSponsorRepository.create).toHaveBeenCalledWith({
        ...mockCreateSponsorDto,
        brandImage: 'uploads/conference-sponsors/test-123456.jpg',
      });
      expect(mockSponsorRepository.save).toHaveBeenCalledWith(mockConferenceSponsor);
    });

    it('should throw BadRequestException if brand image is not provided', async () => {
      await expect(service.create(mockCreateSponsorDto, null, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if conference not found', async () => {
      mockConferenceRepository.findOne.mockResolvedValue(null);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});

      await expect(service.create(mockCreateSponsorDto, mockFile, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateSponsorDto.conferenceId },
      });
      // Check that removeFile was called
      expect(service['removeFile']).toHaveBeenCalledWith(mockFile.path);
    });

    it('should throw ForbiddenException if user cannot manage conference', async () => {
      mockConferenceRepository.findOne.mockResolvedValue(mockConference);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(false);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});

      await expect(service.create(mockCreateSponsorDto, mockFile, mockUser)).rejects.toThrow(ForbiddenException);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConference.id);
      // Check that removeFile was called
      expect(service['removeFile']).toHaveBeenCalledWith(mockFile.path);
    });
  });

  describe('findAll', () => {
    it('should return all sponsors', async () => {
      mockSponsorRepository.find.mockResolvedValue([mockConferenceSponsor]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([mockConferenceSponsor]);
      expect(mockSponsorRepository.find).toHaveBeenCalled();
    });
  });

  describe('findByConference', () => {
    it('should return all sponsors for a specific conference', async () => {
      mockConferenceRepository.findOne.mockResolvedValue(mockConference);
      mockSponsorRepository.find.mockResolvedValue([mockConferenceSponsor]);

      const result = await service.findByConference(mockConference.id);

      expect(result).toEqual([mockConferenceSponsor]);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockConference.id },
      });
      expect(mockSponsorRepository.find).toHaveBeenCalledWith({
        where: { conferenceId: mockConference.id },
      });
    });

    it('should throw NotFoundException if conference not found', async () => {
      mockConferenceRepository.findOne.mockResolvedValue(null);

      await expect(service.findByConference('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single sponsor by ID', async () => {
      mockSponsorRepository.findOne.mockResolvedValue(mockConferenceSponsor);

      const result = await service.findOne(mockConferenceSponsor.id);

      expect(result).toEqual(mockConferenceSponsor);
      expect(mockSponsorRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockConferenceSponsor.id },
        relations: ['conference'],
      });
    });

    it('should throw NotFoundException if sponsor not found', async () => {
      mockSponsorRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockSponsorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        relations: ['conference'],
      });
    });
  });

  describe('update', () => {
    it('should update a sponsor', async () => {
      const updatedSponsor = { ...mockConferenceSponsor, ...mockUpdateSponsorDto };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(true);
      mockSponsorRepository.save.mockResolvedValue(updatedSponsor);

      const result = await service.update(mockConferenceSponsor.id, mockUpdateSponsorDto, null, mockUser);

      expect(result).toEqual(updatedSponsor);
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConferenceSponsor.conferenceId);
      expect(mockSponsorRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockConferenceSponsor,
        ...mockUpdateSponsorDto,
      }));
    });

    it('should update a sponsor with a new image', async () => {
      const updatedSponsor = { 
        ...mockConferenceSponsor, 
        ...mockUpdateSponsorDto,
        brandImage: 'uploads/conference-sponsors/new-image.jpg'
      };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(true);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});
      jest.spyOn<any, any>(service, 'getRelativePath').mockReturnValue('uploads/conference-sponsors/new-image.jpg');
      mockSponsorRepository.save.mockResolvedValue(updatedSponsor);

      const newFile = { ...mockFile, filename: 'new-image.jpg', path: '/tmp/uploads/conference-sponsors/new-image.jpg' };
      const result = await service.update(mockConferenceSponsor.id, mockUpdateSponsorDto, newFile, mockUser);

      expect(result).toEqual(updatedSponsor);
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConferenceSponsor.conferenceId);
      expect(service['removeFile']).toHaveBeenCalledWith(process.cwd() + '/' + mockConferenceSponsor.brandImage);
      expect(service['getRelativePath']).toHaveBeenCalledWith(newFile.path);
      expect(mockSponsorRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockConferenceSponsor,
        ...mockUpdateSponsorDto,
        brandImage: 'uploads/conference-sponsors/new-image.jpg',
      }));
    });

    it('should throw NotFoundException if trying to update with a non-existent conference', async () => {
      const updateDtoWithConference = { ...mockUpdateSponsorDto, conferenceId: 'non-existent-conf' };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      mockConferenceRepository.findOne.mockResolvedValue(null);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});

      await expect(service.update(mockConferenceSponsor.id, updateDtoWithConference, mockFile, mockUser))
        .rejects.toThrow(NotFoundException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: updateDtoWithConference.conferenceId },
      });
      expect(service['removeFile']).toHaveBeenCalledWith(mockFile.path);
    });

    it('should throw ForbiddenException if user cannot manage the new conference', async () => {
      const updateDtoWithConference = { ...mockUpdateSponsorDto, conferenceId: 'conf-2' };
      const newConference = { ...mockConference, id: 'conf-2' };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      mockConferenceRepository.findOne.mockResolvedValue(newConference);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(false);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});

      await expect(service.update(mockConferenceSponsor.id, updateDtoWithConference, mockFile, mockUser))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(mockConferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: updateDtoWithConference.conferenceId },
      });
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, updateDtoWithConference.conferenceId);
      expect(service['removeFile']).toHaveBeenCalledWith(mockFile.path);
    });

    it('should throw ForbiddenException if user cannot manage the current conference', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(false);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});

      await expect(service.update(mockConferenceSponsor.id, mockUpdateSponsorDto, mockFile, mockUser))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConferenceSponsor.conferenceId);
      expect(service['removeFile']).toHaveBeenCalledWith(mockFile.path);
    });
  });

  describe('remove', () => {
    it('should delete a sponsor', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(true);
      jest.spyOn<any, any>(service, 'removeFile').mockImplementation(() => {});
      mockSponsorRepository.remove.mockResolvedValue(undefined);

      await service.remove(mockConferenceSponsor.id, mockUser);

      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConferenceSponsor.conferenceId);
      expect(service['removeFile']).toHaveBeenCalledWith(process.cwd() + '/' + mockConferenceSponsor.brandImage);
      expect(mockSponsorRepository.remove).toHaveBeenCalledWith(mockConferenceSponsor);
    });

    it('should throw ForbiddenException if user cannot manage the conference', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockConferenceSponsor);
      jest.spyOn<any, any>(service, 'canUserManageConference').mockResolvedValue(false);

      await expect(service.remove(mockConferenceSponsor.id, mockUser)).rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockConferenceSponsor.id);
      expect(service['canUserManageConference']).toHaveBeenCalledWith(mockUser, mockConferenceSponsor.conferenceId);
    });
  });

  describe('utility methods', () => {
    it('should get relative path correctly', () => {
      const absolutePath = '/some/absolute/path/to/file.jpg';
      process.cwd = jest.fn().mockReturnValue('/some/absolute/path');
      
      const result = service['getRelativePath'](absolutePath);
      
      expect(result).toBe('to/file.jpg');
    });
    
    it('should remove file safely', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      service['removeFile']('/path/to/file.jpg');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.jpg');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.jpg');
    });
    
    it('should not try to remove file if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      service['removeFile']('/path/to/file.jpg');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.jpg');
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
    
    it('should handle errors when removing files', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      
      console.error = jest.fn();
      
      service['removeFile']('/path/to/file.jpg');
      
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.jpg');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.jpg');
      expect(console.error).toHaveBeenCalled();
    });
  });
});