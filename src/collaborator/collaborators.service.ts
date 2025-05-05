import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Collaborator } from "./entities/collaborator.entity";
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto";
import { UpdateCollaboratorDto } from "./dto/update-collaborator.dto";
import { Event } from "../events/entities/event.entity";
import * as fs from "fs";

@Injectable()
export class CollaboratorService {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(
    createCollaboratorDto: CreateCollaboratorDto,
    file?: Express.Multer.File,
  ): Promise<Collaborator> {
    const existingCollaborator = await this.collaboratorRepository.findOne({
      where: {
        email: createCollaboratorDto.email,
        conferenceId: createCollaboratorDto.conferenceId,
      },
    });

    if (existingCollaborator) {
      throw new BadRequestException("Email already in use for this conference");
    }

    const event = await this.eventRepository.findOne({
      where: { id: createCollaboratorDto.eventId },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const count = await this.collaboratorRepository.count({
      where: { event: { id: createCollaboratorDto.eventId } },
    });

    if (count >= 5) {
      throw new BadRequestException(
        "Maximum number of collaborators (5) reached for this event",
      );
    }

    const collaborator = new Collaborator();
    collaborator.imageUrl = file?.path;
    collaborator.name = createCollaboratorDto.name;
    collaborator.email = createCollaboratorDto.email;
    collaborator.event = event;
    collaborator.conferenceId = createCollaboratorDto.conferenceId;

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

  async findByEvent(eventId: string): Promise<Collaborator[]> {
    return this.collaboratorRepository.find({
      where: { event: { id: eventId } },
      relations: ["event"],
    });
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

  async update(
    id: string,
    updateCollaboratorDto: UpdateCollaboratorDto,
    file?: Express.Multer.File,
  ): Promise<Collaborator> {
    const collaborator = await this.findOne(id);

    if (
      updateCollaboratorDto.email &&
      updateCollaboratorDto.email !== collaborator.email
    ) {
      const existingCollaborator = await this.collaboratorRepository.findOne({
        where: {
          email: updateCollaboratorDto.email,
          conferenceId: collaborator.conferenceId,
        },
      });

      if (existingCollaborator) {
        throw new BadRequestException(
          "Email already in use for this conference",
        );
      }
    }

    if (
      updateCollaboratorDto.conferenceId &&
      updateCollaboratorDto.conferenceId !== collaborator.conferenceId
    ) {
      const count = await this.countByConferenceId(
        updateCollaboratorDto.conferenceId,
      );
      if (count >= 5) {
        throw new BadRequestException(
          "Target conference already has the maximum of 5 collaborators",
        );
      }

      collaborator.conferenceId = updateCollaboratorDto.conferenceId;
    }

    if (
      updateCollaboratorDto.eventId &&
      collaborator.event?.id !== updateCollaboratorDto.eventId
    ) {
      const newEvent = await this.eventRepository.findOne({
        where: { id: updateCollaboratorDto.eventId },
      });

      if (!newEvent) {
        throw new NotFoundException("Event not found");
      }

      const count = await this.collaboratorRepository.count({
        where: { event: { id: updateCollaboratorDto.eventId } },
      });

      if (count >= 5) {
        throw new BadRequestException(
          "Maximum number of collaborators (5) reached for this event",
        );
      }

      collaborator.event = newEvent;
    }

    if (file?.path) {
      collaborator.imageUrl = file.path;
    }

    Object.assign(collaborator, updateCollaboratorDto);

    return this.collaboratorRepository.save(collaborator);
  }

  async remove(id: string, conferenceId?: string): Promise<void> {
    const collaborator = await this.findOne(id);

    if (conferenceId && collaborator.conferenceId !== conferenceId) {
      throw new BadRequestException(
        `Collaborator does not belong to conference ${conferenceId}`,
      );
    }

    if (collaborator.imageUrl && fs.existsSync(collaborator.imageUrl)) {
      fs.unlinkSync(collaborator.imageUrl);
    }

    await this.collaboratorRepository.remove(collaborator);
  }
}
