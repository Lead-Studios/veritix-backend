import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Param, 
    Delete, 
    UseGuards 
  } from '@nestjs/common';
  import { ContactUsService } from './contact-us.service';
  import { CreateContactUsDto } from './dto/create-contact-us.dto';
  import { UserRole } from 'src/common/enums/users-roles.enum';
  import { RoleDecorator } from 'security/decorators/roles.decorator';
  import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
  import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';

  
  @Controller()
  export class ContactUsController {
    constructor(private readonly contactUsService: ContactUsService) {}
  
  
    @Post('contact-us')
    create(@Body() createContactUsDto: CreateContactUsDto) {
      return this.contactUsService.create(createContactUsDto);
    }
  
    @Get('admin/contact-messages')
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    findAll() {
      return this.contactUsService.findAll();
    }
  
    @Get('admin/contact-messages/:id')
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    findOne(@Param('id') id: string) {
      return this.contactUsService.findOne(id);
    }
  
    @Delete('admin/contact-messages/:id')
    @RoleDecorator(UserRole.Admin)
    @UseGuards(JwtAuthGuard, RolesGuard)
    remove(@Param('id') id: string) {
      return this.contactUsService.remove(id);
    }
  }