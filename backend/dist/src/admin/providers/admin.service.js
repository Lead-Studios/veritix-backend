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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const admin_entity_1 = require("../entities/admin.entity");
const bcrypt = require("bcrypt");
let AdminService = class AdminService {
    constructor(adminRepository) {
        this.adminRepository = adminRepository;
    }
    async createAdmin(createAdminDto) {
        const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
        const newAdmin = this.adminRepository.create({
            ...createAdminDto,
            password: hashedPassword,
        });
        const savedAdmin = await this.adminRepository.save(newAdmin);
        return {
            message: 'Admin created successfully',
            adminId: savedAdmin.id,
        };
    }
    async findAll() {
        return this.adminRepository.find({
            select: ['id', 'firstName', 'lastName', 'role', 'email'],
        });
    }
    async findOne(id) {
        const admin = await this.adminRepository.findOne({
            where: { id },
            select: ['id', 'firstName', 'lastName', 'role', 'email'],
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with ID ${id} not found`);
        }
        return admin;
    }
    async findOneByEmail(email) {
        return this.adminRepository.findOne({ where: { email } });
    }
    async findOneById(id) {
        return this.adminRepository.findOne({ where: { id } });
    }
    async update(id, updateAdminDto) {
        const admin = await this.adminRepository.findOne({ where: { id } });
        if (!admin) {
            throw new common_1.NotFoundException('Admin not found');
        }
        if (updateAdminDto.password) {
            updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
        }
        await this.adminRepository.update(id, updateAdminDto);
        return {
            message: 'Admin details updated successfully',
            adminId: id,
        };
    }
    async remove(id) {
        const admin = await this.adminRepository.findOne({ where: { id } });
        if (!admin) {
            throw new common_1.NotFoundException('Admin not found');
        }
        await this.adminRepository.delete(id);
        return { message: 'Admin deleted successfully', adminId: id };
    }
    async setRefreshToken(id, refreshToken) {
        await this.adminRepository.update(id, { refreshToken });
    }
    async setResetToken(id, resetToken, resetTokenExpiry) {
        await this.adminRepository.update(id, { resetToken, resetTokenExpiry });
    }
    async updatePassword(id, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.adminRepository.update(id, {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
        });
    }
    async setVerificationToken(id, verificationToken, verificationTokenExpiry) {
        await this.adminRepository.update(id, {
            verificationToken,
            verificationTokenExpiry,
        });
    }
    async verifyEmail(id) {
        await this.adminRepository.update(id, {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [typeorm_1.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map