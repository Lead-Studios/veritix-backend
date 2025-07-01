"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const gallery_image_entity_1 = require("../entities/gallery-image.entity");
const event_entity_1 = require("../entities/event.entity");
let GalleryService = class GalleryService {
    galleryRepo;
    eventRepo;
    constructor(galleryRepo, eventRepo) {
        this.galleryRepo = galleryRepo;
        this.eventRepo = eventRepo;
    }
    async create(dto) {
        const event = await this.eventRepo.findOne({ where: { id: dto.eventId }, relations: ['images'] });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        if (event.images.length >= 10)
            throw new common_1.BadRequestException('Maximum 10 images per event');
        const image = this.galleryRepo.create({
            imageUrl: dto.imageUrl,
            description: dto.description,
            event,
        });
        return this.galleryRepo.save(image);
    }
    async findAll() {
        return this.galleryRepo.find({ relations: ['event'] });
    }
    async findOne(id) {
        const image = await this.galleryRepo.findOne({ where: { id }, relations: ['event'] });
        if (!image)
            throw new common_1.NotFoundException('Image not found');
        return image;
    }
    async findByEvent(eventId) {
        const event = await this.eventRepo.findOne({ where: { id: eventId }, relations: ['images'] });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return event.images;
    }
    async update(id, dto) {
        const image = await this.galleryRepo.findOne({ where: { id } });
        if (!image)
            throw new common_1.NotFoundException('Image not found');
        image.description = dto.description;
        return this.galleryRepo.save(image);
    }
    async remove(id) {
        const image = await this.galleryRepo.findOne({ where: { id } });
        if (!image)
            throw new common_1.NotFoundException('Image not found');
        await this.galleryRepo.remove(image);
        return { deleted: true };
    }
};
exports.GalleryService = GalleryService;
exports.GalleryService = GalleryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(gallery_image_entity_1.GalleryImage)),
    __param(1, (0, typeorm_1.InjectRepository)(event_entity_1.Event)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], GalleryService);
//# sourceMappingURL=gallery.service.js.map