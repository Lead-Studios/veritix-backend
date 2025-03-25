import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollaboratorsController } from "./collaborators.controller";
import { CollaboratorsService } from "./collaborators.service";
import { Collaborator } from "./entities/collaborator.entity";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";

@Module({
  imports: [
    TypeOrmModule.forFeature([Collaborator]),
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads/collaborators",
        filename: (req, file, callback) => {
          const uniqueName = uuidv4();
          const extension = extname(file.originalname);
          callback(null, `${uniqueName}${extension}`);
        },
      }),
    }),
  ],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, JwtAuthGuard, RolesGuard],
  exports: [CollaboratorsService],
})
export class CollaboratorsModule {}
