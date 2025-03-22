import { NotFoundException } from "@nestjs/common"

export class UserNotFoundException extends NotFoundException {
  constructor(userId: number) {
    super(`User with ID ${userId} not found`)
  }
}

