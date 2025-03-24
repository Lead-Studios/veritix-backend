import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PostersController } from "./posters.controller"
import { PostersService } from "./posters.service"
import { Poster } from "./entities/poster.entity"
import { MulterModule } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import { extname } from "path"
import { v4 as uuidv4 } from "uuid"

@Module({
  imports: [
    TypeOrmModule.forFeature([Poster]),
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads/posters",
        filename: (req, file, callback) => {
          const uniqueName = uuidv4()
          const extension = extname(file.originalname)
          callback(null, `${uniqueName}${extension}`)
        },
      }),
    }),
  ],
  controllers: [PostersController],
  providers: [PostersService],
  exports: [PostersService],
})
export class PostersModule {}

