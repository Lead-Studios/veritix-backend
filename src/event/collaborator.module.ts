import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Collaborator } from './entities/collaborator.entity';
import { Event } from './entities/event.entity';
import { CollaboratorService } from './services/collaborator.service';
import { CollaboratorController } from './controllers/collaborator.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Collaborator, Event]), MulterModule.register()],
  providers: [CollaboratorService],
  controllers: [CollaboratorController],
  exports: [CollaboratorService],
})
export class CollaboratorModule {} 