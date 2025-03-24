import { Test, TestingModule } from '@nestjs/testing';
import { PostersController } from './posters.controller';
import { PostersService } from './posters.service';

describe('PostersController', () => {
  let controller: PostersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostersController],
      providers: [PostersService],
    }).compile();

    controller = module.get<PostersController>(PostersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
