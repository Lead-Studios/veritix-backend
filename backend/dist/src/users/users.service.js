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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("./entities/user.entity");
const create_users_provider_1 = require("./providers/create-users-provider");
const typeorm_2 = require("typeorm");
const find_one_by_email_provider_1 = require("./providers/find-one-by-email.provider");
const hashing_services_1 = require("../admin/providers/hashing-services");
let UsersService = class UsersService {
    constructor(userRepository, findOneByEmailProvider, createUserProvider, hashingProvider) {
        this.userRepository = userRepository;
        this.findOneByEmailProvider = findOneByEmailProvider;
        this.createUserProvider = createUserProvider;
        this.hashingProvider = hashingProvider;
    }
    create(createUserDto) {
        return this.createUserProvider.createUser(createUserDto);
    }
    async GetOneByEmail(email) {
        return await this.findOneByEmailProvider.FindByEmail(email);
    }
    async findAll(page, limit) {
        const [users, total] = await this.userRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { id: 'ASC' },
        });
        return {
            total,
            page,
            limit,
            data: users,
        };
    }
    async softDelete(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        await this.userRepository.softDelete(id);
        return { message: `User with ID ${id} has been deleted.` };
    }
    async findOneById(id) {
        return await this.userRepository.findOneBy({ id });
    }
    remove(id) {
        return `This action removes a #${id} user`;
    }
    async updateUser(id, updateUserDto) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            return null;
        }
        if (updateUserDto.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email: updateUserDto.email },
            });
            if (existingUser && existingUser.id !== id) {
                throw new common_1.BadRequestException('Please check your email id');
            }
        }
        const allowedUpdates = ['name', 'email'];
        for (const key of Object.keys(updateUserDto)) {
            if (allowedUpdates.includes(key)) {
                user[key] = updateUserDto[key];
            }
        }
        return this.userRepository.save(user);
    }
    async findById(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async updateProfile(id, updateData) {
        const allowedUpdates = {
            userName: updateData.userName,
            email: updateData.email,
        };
        await this.userRepository.update(id, allowedUpdates);
        return this.findById(id);
    }
    async changePassword(id, dto) {
        const user = await this.findById(id);
        const isValidPassword = await this.hashingProvider.comparePassword(dto.currentPassword, user.password);
        if (!isValidPassword)
            throw new common_1.UnauthorizedException('Invalid current password');
        if (dto.currentPassword === dto.newPassword) {
            throw new common_1.BadRequestException('New password must be different from the current password');
        }
        const hashedPassword = await this.hashingProvider.hashPassword(dto.newPassword);
        await this.userRepository.update(id, { password: hashedPassword });
    }
    async updateProfileImage(id, dto) {
        await this.userRepository.update(id, { profileImageUrl: dto.imageUrl });
        return this.findById(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        find_one_by_email_provider_1.FindOneByEmailProvider,
        create_users_provider_1.CreateUsersProvider,
        hashing_services_1.HashingProvider])
], UsersService);
//# sourceMappingURL=users.service.js.map