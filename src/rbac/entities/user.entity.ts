import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Role } from "../../rbac/enums/role.enum"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({
    type: "enum",
    enum: Role,
    array: true,
    default: [Role.USER],
  })
  roles: Role[]

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Helper methods
  hasRole(role: Role): boolean {
    return this.roles.includes(role)
  }

  hasAnyRole(roles: Role[]): boolean {
    return roles.some((role) => this.roles.includes(role))
  }

  hasAllRoles(roles: Role[]): boolean {
    return roles.every((role) => this.roles.includes(role))
  }

  addRole(role: Role): void {
    if (!this.roles.includes(role)) {
      this.roles.push(role)
    }
  }

  removeRole(role: Role): void {
    this.roles = this.roles.filter((r) => r !== role)
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN)
  }

  isOrganizer(): boolean {
    return this.hasRole(Role.ORGANIZER)
  }

  isUser(): boolean {
    return this.hasRole(Role.USER)
  }
}
