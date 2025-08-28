import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { QuestionVote } from './entities/question-vote.entity';
import { Poll } from './entities/poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollVote } from './entities/poll-vote.entity';
import { QuestionService } from './services/question.service';
import { PollService } from './services/poll.service';
import { QuestionController } from './controllers/question.controller';
import { PollController } from './controllers/poll.controller';
import { QaPollsGateway } from './gateways/qa-polls.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionVote,
      Poll,
      PollOption,
      PollVote,
    ]),
  ],
  controllers: [QuestionController, PollController],
  providers: [QuestionService, PollService, QaPollsGateway],
  exports: [QuestionService, PollService, QaPollsGateway],
})
export class QaPollsModule {}
