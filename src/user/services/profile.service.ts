import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import * as bcrypt from 'bcryptjs';
import * as AWS from 'aws-sdk';
import { Express } from 'express';
import { File as MulterFile } from 'multer';

@Injectable()
export class ProfileService {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  private bucket = process.env.AWS_S3_BUCKET;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'password'] });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { password: hash });
    return { message: 'Password changed successfully' };
  }

  async uploadProfileImage(userId: string, file: MulterFile) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!this.bucket) throw new Error('AWS_S3_BUCKET is not set');
    const key = `profile-images/${userId}-${Date.now()}-${file.originalname}`;
    await this.s3
      .putObject({
        Bucket: this.bucket as string,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
      .promise();
    const imageUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    await this.userRepo.update(userId, { profileImage: imageUrl });
    return { profileImage: imageUrl };
  }
} 