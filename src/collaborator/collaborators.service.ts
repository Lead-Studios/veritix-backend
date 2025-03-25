import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Collaborator } from "./entities/collaborator.entity";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import * as fs from "fs";

@Injectable()
export class CollaboratorsService {
  constructor(
    @InjectRepository(Collaborator)
    private collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(
    file: Express.Multer.File,
    createCollaboratorDto: CreateCollaboratorDto,
  ): Promise<Collaborator> {
    if (!file) {
      throw new BadRequestException("Collaborator image is required");
    }

    try {
      const collaborator = new Collaborator();
      collaborator.imageUrl = file.path;
      collaborator.name = createCollaboratorDto.name;
      collaborator.email = createCollaboratorDto.email;
      collaborator.eventId = createCollaboratorDto.eventId;
      // Check collaborator limit
      const count = await this.collaboratorRepository.count({
        where: { eventId: createCollaboratorDto.eventId },
      });

      if (count >= 5) {
        throw new BadRequestException(
          "Maximum number of collaborators (5) reached for this event",
        );
      }
      return this.collaboratorRepository.save(collaborator);
    } catch (error) {
      throw new BadRequestException("Failed to create collaborator");
    }
  }

  async findAll(): Promise<Collaborator[]> {
    return this.collaboratorRepository.find();
  }

  async findOne(id: string): Promise<Collaborator> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { id },
    });
    if (!collaborator) {
      throw new NotFoundException("Collaborator not found");
    }
    return collaborator;
  }

  async findByEvent(eventId: string): Promise<Collaborator[]> {
    return this.collaboratorRepository.find({ where: { eventId } });
  }

  async update(
    id: string,
    file: Express.Multer.File,
    updateCollaboratorDto: Partial<CreateCollaboratorDto>,
  ): Promise<Collaborator> {
    const collaborator = await this.findOne(id);
    try {
      if (collaborator.eventId !== updateCollaboratorDto.eventId) {
        // Check collaborator limit
        const count = await this.collaboratorRepository.count({
          where: { eventId: updateCollaboratorDto.eventId },
        });

        if (count >= 5) {
          throw new BadRequestException(
            "Maximum number of collaborators (5) reached for this event",
          );
        }
      } else {
        collaborator.eventId = updateCollaboratorDto.eventId;
      }

      if (updateCollaboratorDto.name) {
        collaborator.name = updateCollaboratorDto.name;
      }

      if (updateCollaboratorDto.email) {
        collaborator.email = updateCollaboratorDto.email;
      }

      if (file) {
        // update image if new image is provided
        if (collaborator.imageUrl && fs.existsSync(collaborator.imageUrl)) {
          fs.unlinkSync(collaborator.imageUrl);
        }
        collaborator.imageUrl = file.path;
      }
      return this.collaboratorRepository.save(collaborator);
    } catch (error) {
      throw new BadRequestException("Failed to update collaborator");
    }
  }

  async remove(id: string): Promise<void> {
    const collaborator = await this.findOne(id);
    try {
      if (collaborator.imageUrl && fs.existsSync(collaborator.imageUrl)) {
        fs.unlinkSync(collaborator.imageUrl);
        const result = await this.collaboratorRepository.delete(id);
        if (!result.affected) {
          throw new NotFoundException("Collaborator not found");
        }
      }
    } catch (error) {
      throw new BadRequestException("Failed to delete collaborator");
    }
  }
}
