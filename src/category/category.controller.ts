import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { CategoryService } from "./category.service";
import { Category } from "./category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";

@ApiTags("Categories")
@ApiBearerAuth()
@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Create event category",
    description: "Create a new event category",
  })
  @ApiResponse({
    status: 201,
    description: "Category created successfully",
    type: Category,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all categories",
    description: "Retrieve all event categories",
  })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
    type: [Category],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get category by ID",
    description: "Retrieve a specific event category by ID",
  })
  @ApiParam({
    name: "id",
    description: "Category ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Category found",
    type: Category,
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findOne(@Param("id") id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Put(":id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Update category",
    description: "Update an existing event category",
  })
  @ApiParam({
    name: "id",
    description: "Category ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Category updated successfully",
    type: Category,
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Delete category",
    description: "Delete an event category",
  })
  @ApiParam({
    name: "id",
    description: "Category ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({ status: 200, description: "Category deleted successfully" })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.categoryService.remove(id);
  }
}
