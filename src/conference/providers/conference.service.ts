import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import {
  Conference,
  ConferenceVisibility,
} from "../entities/conference.entity";
import {
  CreateConferenceDto,
  UpdateConferenceDto,
  ConferenceFilterDto,
} from "../dto";
import { User } from "src/users/entities/user.entity";
import { UserRole } from "src/common/enums/users-roles.enum";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";

@Injectable()
export class ConferenceService {
  constructor(
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    createConferenceDto: CreateConferenceDto,
    user: User,
  ): Promise<Conference> {
    const { location, bankDetails, socialMedia, ...conferenceData } =
      createConferenceDto;

    const conference = this.conferenceRepository.create({
      ...conferenceData,
      // Flatten location properties
      country: location.country,
      state: location.state,
      street: location.street,
      localGovernment: location.localGovernment,
      direction: location.direction,
      hideLocation: location.hideLocation || false,

      // Flatten bank details
      bankName: bankDetails.bankName,
      bankAccountNumber: bankDetails.bankAccountNumber,
      accountName: bankDetails.accountName,

      // Flatten social media
      facebook: socialMedia?.facebook,
      twitter: socialMedia?.twitter,
      instagram: socialMedia?.instagram,
      // Default values
      comingSoon: conferenceData.comingSoon || false,
      transactionCharge: conferenceData.transactionCharge || false,
      // Set the organizer
      organizerId: user.id ?? null,
    });

    return this.conferenceRepository.save(conference);
  }

  async findAll(): Promise<Conference[]> {
    return this.conferenceRepository.find();
  }

  async findOne(id: string): Promise<Conference> {
    const conference = await this.conferenceRepository.findOne({
      where: { id },
    });

    if (!conference) {
      throw new NotFoundException(`Conference with ID ${id} not found`);
    }

    return conference;
  }

  async update(
    id: string,
    updateConferenceDto: UpdateConferenceDto,
  ): Promise<Conference> {
    const conference = await this.findOne(id);

    const { location, bankDetails, socialMedia, ...conferenceData } =
      updateConferenceDto;

    // Update base conference data
    Object.assign(conference, conferenceData);

    // Update location properties if provided
    if (location) {
      if (location.country) conference.country = location.country;
      if (location.state) conference.state = location.state;
      if (location.street) conference.street = location.street;
      if (location.localGovernment)
        conference.localGovernment = location.localGovernment;
      if (location.direction !== undefined)
        conference.direction = location.direction;
      if (location.hideLocation !== undefined)
        conference.hideLocation = location.hideLocation;
    }

    // Update bank details if provided
    if (bankDetails) {
      if (bankDetails.bankName) conference.bankName = bankDetails.bankName;
      if (bankDetails.bankAccountNumber)
        conference.bankAccountNumber = bankDetails.bankAccountNumber;
      if (bankDetails.accountName)
        conference.accountName = bankDetails.accountName;
    }

    // Update social media if provided
    if (socialMedia) {
      if (socialMedia.facebook !== undefined)
        conference.facebook = socialMedia.facebook;
      if (socialMedia.twitter !== undefined)
        conference.twitter = socialMedia.twitter;
      if (socialMedia.instagram !== undefined)
        conference.instagram = socialMedia.instagram;
    }

    return this.conferenceRepository.save(conference);
  }

  async remove(id: string): Promise<void> {
    const conference = await this.findOne(id);
    await this.conferenceRepository.remove(conference);
  }

  async findCollaborator(id: string): Promise<Conference> {
    const conference = await this.conferenceRepository.findOne({
      where: { id },
    });

    if (!conference) {
      throw new NotFoundException(`Collaborator with ID ${id} not found`);
    }

    return conference;
  }

  private async checkConferenceAccess(
    conference: Conference,
    user?: User,
  ): Promise<boolean> {
    if (conference.visibility === ConferenceVisibility.PUBLIC) {
      return true;
    }

    if (!user) {
      return false;
    }

    // Allow access if user is admin
    if (user.role === UserRole.Admin) {
      return true;
    }

    // Allow access if user is the organizer
    if (conference.organizerId.toString() == user.id) {
      return true;
    }

    // For private conferences, check if user has specific access
    if (conference.visibility === ConferenceVisibility.PRIVATE) {
      // TODO: Implement specific access checks (e.g., ticket holders, collaborators)
      // Check if the user is a collaborator
      if (
        conference.collaborators?.some(
          (collaborator) => collaborator.id === user.id,
        )
      ) {
        return true;
      }
      // Check if the user has purchased a ticket for the conference
      if (
        conference.tickets?.some(
          (ticketHolder) => ticketHolder.id.toString() === user.id,
        )
      ) {
        return true;
      }
      return false;
    }

    return false;
  }
  async findAllWithFilters(filter: ConferenceFilterDto, user?: User) {
    const {
      name,
      category,
      location,
      visibility,
      page = 1,
      limit = 10,
    } = filter;

    // Generate cache key based on filter parameters
    const cacheKey = `conferences:${JSON.stringify({ name, category, location, visibility, page, limit })}`;

    // Try to get cached results for public conferences
    if (!visibility || visibility === ConferenceVisibility.PUBLIC) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let where: any = {};

    // Apply visibility filter
    if (visibility) {
      where.visibility = visibility;
    } else {
      // Default to public conferences if no visibility specified
      where.visibility = ConferenceVisibility.PUBLIC;
    }

    // Apply search filters
    if (name) where.conferenceName = ILike(`%${name}%`);
    if (category) where.conferenceCategory = ILike(`%${category}%`);

    // Apply location filter across all location fields
    if (location) {
      where = [
        { ...where, country: ILike(`%${location}%`) },
        { ...where, state: ILike(`%${location}%`) },
        { ...where, street: ILike(`%${location}%`) },
        { ...where, localGovernment: ILike(`%${location}%`) },
      ];
    }

    const [results, totalCount] = await this.conferenceRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { conferenceDate: "DESC" },
      relations: ["organizer"],
    });

    // Filter results based on user access
    const accessibleResults = await Promise.all(
      results.map(async (conference) => {
        const hasAccess = await this.checkConferenceAccess(conference, user);
        return hasAccess ? conference : null;
      }),
    ).then((results) => results.filter(Boolean));

    // Transform results to match the required format
    const transformedResults = accessibleResults.map((conference) => ({
      id: conference.id,
      name: conference.conferenceName,
      category: conference.conferenceCategory,
      date: conference.conferenceDate,
      location: {
        country: conference.country,
        state: conference.state,
        street: conference.street,
        lga: conference.localGovernment,
      },
      image: conference.conferenceImage,
    }));

    return {
      data: transformedResults,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}
