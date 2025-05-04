import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "src/common/enums/users-roles.enum";

export class UserResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Unique identifier for the user",
  })
  id: string;

  @ApiProperty({
    example: "user@example.com",
    description: "Email address of the user",
  })
  email: string;

  @ApiProperty({
    example: "johndoe",
    description: "Username for login",
  })
  username: string;

  @ApiProperty({
    example: "John",
    description: "First name of the user",
  })
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "Last name of the user",
  })
  lastName: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.User,
    description: "Role assigned to the user",
  })
  role: UserRole;

  @ApiProperty({
    example: true,
    description: "Whether the user account is active",
  })
  isActive: boolean;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "Date and time when the user was created",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2023-01-02T00:00:00Z",
    description: "Date and time when the user was last updated",
  })
  updatedAt: Date;

  refreshToken: any;
}
