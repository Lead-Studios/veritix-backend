import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { ConferenceSponsor } from "./entities/conference-sponsor.entity";
import { Conference } from "./../conference/entities/conference.entity";
import { UpdateConferenceSponsorDto } from "./dto/update-conference-sponsor.dto";
import { CreateConferenceSponsorDto } from "./dto/create-conference-sponsor.dto";
import { User } from "../users/entities/user.entity";

@Injectable()
export class ConferenceSponsorsService {
  constructor(
    @InjectRepository(ConferenceSponsor)
    private sponsorRepository: Repository<ConferenceSponsor>,
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
  ) {
    const uploadDir = path.join(process.cwd(), "uploads/conference-sponsors");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Create a new sponsor
   * @param createConferenceSponsorDto - Data for creating a sponsor
   * @param brandImage - Uploaded brand image file
   * @param currentUser - The authenticated user
   * @returns The created sponsor
   */
  async create(
    createConferenceSponsorDto: CreateConferenceSponsorDto,
    brandImage: Express.Multer.File,
    currentUser: User,
  ): Promise<ConferenceSponsor> {
    if (!brandImage) {
      throw new BadRequestException("Brand image is required");
    }

    const conference = await this.conferenceRepository.findOne({
      where: { id: createConferenceSponsorDto.conferenceId },
    });

    if (!conference) {
      // Remove the uploaded file if conference not found
      this.removeFile(brandImage.path);
      throw new NotFoundException(
        `Conference with ID ${createConferenceSponsorDto.conferenceId} not found`,
      );
    }

    const canManageConference = await this.canUserManageConference(
      currentUser,
      conference.id,
    );
    if (!canManageConference) {
      // Remove the uploaded file if permission denied
      this.removeFile(brandImage.path);
      throw new ForbiddenException(
        "You do not have permission to add sponsors to this conference",
      );
    }

    const sponsor = this.sponsorRepository.create({
      ...createConferenceSponsorDto,
      brandImage: this.getRelativePath(brandImage.path),
    });

    return this.sponsorRepository.save(sponsor);
  }

  /**
   * Get all sponsors
   * @returns All sponsors
   */
  async findAll(currentUser: User): Promise<ConferenceSponsor[]> {
    return this.sponsorRepository.find();
  }

  /**
   * @param conferenceId - ID of the conference
   * @returns Sponsors for the specified conference
   */
  async findByConference(conferenceId: string): Promise<ConferenceSponsor[]> {
    const conference = await this.conferenceRepository.findOne({
      where: { id: conferenceId },
    });

    if (!conference) {
      throw new NotFoundException(
        `Conference with ID ${conferenceId} not found`,
      );
    }

    return this.sponsorRepository.find({
      where: { conferenceId },
    });
  }

  /**
   * Get a single sponsor by ID
   * @param id - ID of the sponsor
   * @returns The sponsor with the specified ID
   */
  async findOne(id: string): Promise<ConferenceSponsor> {
    const sponsor = await this.sponsorRepository.findOne({
      where: { id },
      relations: ["conference"],
    });

    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }

    return sponsor;
  }

  /**
   * Update a sponsor
   * @param id - ID of the sponsor to update
   * @param updateConferenceSponsorDto - Data to update the sponsor with
   * @param brandImage - Updated brand image file (optional)
   * @param currentUser - The authenticated user
   * @returns The updated sponsor
   */
  async update(
    id: string,
    updateConferenceSponsorDto: UpdateConferenceSponsorDto,
    brandImage: Express.Multer.File,
    currentUser: User,
  ): Promise<ConferenceSponsor> {
    const sponsor = await this.findOne(id);

    if (
      updateConferenceSponsorDto.conferenceId &&
      updateConferenceSponsorDto.conferenceId !== sponsor.conferenceId
    ) {
      const newConference = await this.conferenceRepository.findOne({
        where: { id: updateConferenceSponsorDto.conferenceId },
      });

      if (!newConference) {
        if (brandImage) {
          this.removeFile(brandImage.path);
        }
        throw new NotFoundException(
          `Conference with ID ${updateConferenceSponsorDto.conferenceId} not found`,
        );
      }

      const canManageNewConference = await this.canUserManageConference(
        currentUser,
        updateConferenceSponsorDto.conferenceId,
      );
      if (!canManageNewConference) {
        if (brandImage) {
          this.removeFile(brandImage.path);
        }
        throw new ForbiddenException(
          "You do not have permission to move this sponsor to the specified conference",
        );
      }
    }

    const canManageCurrentConference = await this.canUserManageConference(
      currentUser,
      sponsor.conferenceId,
    );
    if (!canManageCurrentConference) {
      if (brandImage) {
        this.removeFile(brandImage.path);
      }
      throw new ForbiddenException(
        "You do not have permission to update this sponsor",
      );
    }

    // Update the sponsor data
    Object.assign(sponsor, updateConferenceSponsorDto);

    if (brandImage) {
      if (sponsor.brandImage) {
        const oldImagePath = path.join(process.cwd(), sponsor.brandImage);
        this.removeFile(oldImagePath);
      }
      sponsor.brandImage = this.getRelativePath(brandImage.path);
    }

    return this.sponsorRepository.save(sponsor);
  }

  /**
   * Delete a sponsor
   * @param id - ID of the sponsor to delete
   * @param currentUser - The authenticated user
   */
  async remove(id: string, currentUser: User): Promise<void> {
    const sponsor = await this.findOne(id);

    const canManageConference = await this.canUserManageConference(
      currentUser,
      sponsor.conferenceId,
    );
    if (!canManageConference) {
      throw new ForbiddenException(
        "You do not have permission to delete this sponsor",
      );
    }

    // Delete the image file
    if (sponsor.brandImage) {
      const imagePath = path.join(process.cwd(), sponsor.brandImage);
      this.removeFile(imagePath);
    }

    await this.sponsorRepository.remove(sponsor);
  }

  /**
   * @param user - The user to check
   * @param conferenceId - The conference ID
   * @returns Whether the user can manage the conference
   */
  private async canUserManageConference(
    user: User,
    conferenceId: string,
  ): Promise<boolean> {
    return true;
  }

  /**
   * Get the relative path of a file from the project root
   * @param absolutePath - Absolute path of the file
   * @returns Relative path from project root
   */
  private getRelativePath(absolutePath: string): string {
    return absolutePath
      .replace(process.cwd() + path.sep, "")
      .replace(/\\/g, "/");
  }

  /**
   * @param filePath - Path of the file to remove
   */
  private removeFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error);
    }
  }
}
