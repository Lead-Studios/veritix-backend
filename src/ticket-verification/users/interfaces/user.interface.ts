import type { Role } from "../../auth/enums/role.enum"

export interface User {
  id: string
  username: string
  email: string
  password: string
  roles: Role[]
}

