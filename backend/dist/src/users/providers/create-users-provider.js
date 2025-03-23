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
exports.CreateUsersProvider = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("../entities/user.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const hashing_provider_1 = require("../../auth/providers/hashing-provider");
let CreateUsersProvider = class CreateUsersProvider {
    constructor(hashingProvider, userRepository) {
        this.hashingProvider = hashingProvider;
        this.userRepository = userRepository;
    }
    async createUser(createUserDto) {
        let existingUser;
        try {
            existingUser = await this.userRepository.findOne({
                where: { email: createUserDto.email },
            });
        }
        catch (error) {
            if (error instanceof Error) {
                console.error('Error finding user:', error.message);
                throw new common_1.RequestTimeoutException('Unable to connect to database. Please try again later', { description: 'Error connecting to database' });
            }
            throw new common_1.RequestTimeoutException('An unknown error occurred.');
        }
        if (existingUser) {
            throw new common_1.BadRequestException('User already exists in the database. Use a different email');
        }
        const hashedPassword = await this.hashingProvider.hashPassword(createUserDto.password);
        const newUser = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
        });
        const savedUser = await this.userRepository.save(newUser);
        try {
            return savedUser;
        }
        catch (error) {
            console.error('Error saving user:', error);
            throw new common_1.RequestTimeoutException('Error connecting to the database');
        }
    }
};
exports.CreateUsersProvider = CreateUsersProvider;
exports.CreateUsersProvider = CreateUsersProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => hashing_provider_1.HashingProvider))),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [hashing_provider_1.HashingProvider,
        typeorm_2.Repository])
], CreateUsersProvider);
//# sourceMappingURL=create-users-provider.js.map