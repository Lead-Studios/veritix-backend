import { SetMetadata } from "@nestjs/common"
import type { Role } from "../enums/role.enum"

export const Roles = (...roles: Role[]) => SetMetadata("roles", roles)

