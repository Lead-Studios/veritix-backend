import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { ThrottlerGuard } from "@nestjs/throttler";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  async create(@Body() createContactDto: CreateContactDto) {
    await this.contactService.create(createContactDto);
    return { message: "Your inquiry has been submitted successfully." };
  }
}
