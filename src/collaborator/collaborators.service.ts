import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Collaborator } from "./entities/collaborator.entity";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";

@Injectable()
export class CollaboratorsService {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(
    createCollaboratorDto: CreateCollaboratorDto,
  ): Promise<Collaborator> {
    // Check collaborator limit
    const count = await this.collaboratorRepository.count({
      where: { eventId: createCollaboratorDto.eventId },
    });

    if (count >= 5) {
      throw new BadRequestException(
        "Maximum number of collaborators (5) reached for this event",
      );
    }

    const collaborator = this.collaboratorRepository.create(
      createCollaboratorDto,
    );
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
      throw new NotFoundException("Collaborator not found");
    }
    return collaborator;
  }

  async findByEvent(eventId: string): Promise<Collaborator[]> {
    return this.collaboratorRepository.find({ where: { eventId } });
  }

  async update(
    id: string,
    updateCollaboratorDto: Partial<CreateCollaboratorDto>,
  ): Promise<Collaborator> {
    const collaborator = await this.findOne(id);
    Object.assign(collaborator, updateCollaboratorDto);
    return this.collaboratorRepository.save(collaborator);
  }

  async remove(id: string): Promise<void> {
    const result = await this.collaboratorRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException("Collaborator not found");
    }
  }
}
