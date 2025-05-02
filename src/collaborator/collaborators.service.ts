import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';

@Injectable()
export class CollaboratorService {
  constructor(
    @InjectRepository(Collaborator)
    private collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(createCollaboratorDto: CreateCollaboratorDto): Promise<Collaborator> {
    // Check if email is already used in thisis conference
    const existingCollaborator = await this.collaboratorRepository.findOne({
      where: {
        email: createCollaboratorDto.email,
        conferenceId: createCollaboratorDto.conferenceId,
      },
    });

    if (existingCollaborator) {
      throw new BadRequestException('Email already in use for this conference');
    }

    // Double-check the 5 collaborator limit at the service level
    const count = await this.countByConferenceId(createCollaboratorDto.conferenceId);
    if (count >= 5) {
      throw new BadRequestException('Conference already has the maximum of 5 collaborators');
    }

    const collaborator = this.collaboratorRepository.create(createCollaboratorDto);
    return this.collaboratorRepository.save(collaborator);
  }

  async findAll(): Promise<Collaborator[]> {
    return this.collaboratorRepository.find();
  }

  async findOne(id: string): Promise<Collaborator> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { id },
    });
    
    if (!collaborator) {
      throw new NotFoundException(`Collaborator with ID ${id} not found`);
    }
    
    return collaborator;
  }

  async findByConferenceId(conferenceId: string): Promise<Collaborator[]> {
    return this.collaboratorRepository.find({
      where: { conferenceId },
    });
  }

  async countByConferenceId(conferenceId: string): Promise<number> {
    return this.collaboratorRepository.count({
      where: { conferenceId },
    });
  }

  async update(id: string, updateCollaboratorDto: UpdateCollaboratorDto): Promise<Collaborator> {
    const collaborator = await this.findOne(id);
    
    // If email is being updated, check if it's already in use
    if (updateCollaboratorDto.email && updateCollaboratorDto.email !== collaborator.email) {
      const existingCollaborator = await this.collaboratorRepository.findOne({
        where: {
          email: updateCollaboratorDto.email,
          conferenceId: collaborator.conferenceId,
        },
      });

      if (existingCollaborator) {
        throw new BadRequestException('Email already in use for this conference');
      }
    }
    
    // If conferenceId is being updated, check the 5 collaborator limit
    if (updateCollaboratorDto.conferenceId && updateCollaboratorDto.conferenceId !== collaborator.conferenceId) {
      const count = await this.countByConferenceId(updateCollaboratorDto.conferenceId);
      if (count >= 5) {
        throw new BadRequestException('Target conference already has the maximum of 5 collaborators');
      }
    }
    
    Object.assign(collaborator, updateCollaboratorDto);
    return this.collaboratorRepository.save(collaborator);
  }

  async remove(id: string, conferenceId?: string): Promise<void> {
    try {
        const collaborator = await this.findOne(id);

        if (conferenceId && collaborator.conferenceId !== conferenceId) {
        throw new BadRequestException(
            `Collaborator does not belong to conference ${conferenceId}`,
        );
        }

        await this.collaboratorRepository.remove(collaborator);
    } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
        }
        throw new BadRequestException(`Failed to remove collaborator: ${error.message}`);
     }
    }
}