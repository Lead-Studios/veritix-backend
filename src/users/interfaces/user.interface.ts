/**
 * User Interfaces for VeriTix
 *
 * This file defines the core user identity abstractions used across
 * the VeriTix system. These interfaces provide a contract for user
 * data without coupling to specific database implementations.
 */

/**
 * Core user identity interface.
 * Represents the essential user information needed for identity and ownership.
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** User's email address */
  email: string;

  /** User's display name */
  name?: string;

  /** User's roles in the system */
  roles: string[];

  /** Whether the user's email is verified */
  isEmailVerified?: boolean;

  /** User's profile image URL */
  profileImage?: string;

  /** Optional wallet address for blockchain integration */
  walletAddress?: string;

  /** Account creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * User profile information (public-facing data).
 */
export interface UserProfile {
  id: string;
  name?: string;
  email: string;
  profileImage?: string;
  walletAddress?: string;
}

/**
 * User role enumeration.
 * Defines the standard roles in the VeriTix system.
 */
export enum UserRole {
  /** Regular user - can purchase tickets, attend events */
  USER = 'user',

  /** Event organizer - can create and manage events */
  ORGANIZER = 'organizer',

  /** Administrator - full system access */
  ADMIN = 'admin',

  /** Moderator - limited admin capabilities */
  MODERATOR = 'moderator',
}

/**
 * User creation data transfer object interface.
 */
export interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
  walletAddress?: string;
  roles?: string[];
}

/**
 * User update data transfer object interface.
 */
export interface UpdateUserData {
  name?: string;
  profileImage?: string;
  walletAddress?: string;
}
