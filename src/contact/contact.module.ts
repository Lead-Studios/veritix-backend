import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactMessage } from './entities/contact-message-entity';
import { AdminContactController } from './admin-contact.controller';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactMessage]),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 5, // 5 requests per minute
    }]),
  ],
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
})
export class ContactModule {}