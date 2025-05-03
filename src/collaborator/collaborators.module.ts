import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { ConferenceModule } from 'src/conference/conference.module';
import { CollaboratorService } from './collaborators.service';
import { CollaboratorController } from './collaborators.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collaborator]),
    ConferenceModule,
  ],
  controllers: [CollaboratorController],
  providers: [CollaboratorService],
  exports: [CollaboratorService],
})
export class CollaboratorModule {}