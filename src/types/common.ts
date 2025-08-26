/**
 * Common types and interfaces shared across the application
 */

// Provider types
export type Provider = 'github' | 'google';

// Base user interface for authenticated users
export interface BaseUser {
  id: string;
  provider: Provider;
  username: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

// Database user representation
export interface DatabaseUser {
  id: number;
  providerId: string;
  provider: Provider;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  displayName: string;
  fullName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// OAuth profile interfaces
export interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

// Provider API response types
export interface GitHubUserResponse {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url: string;
}

export interface GoogleTokenInfoResponse {
  sub: string; // User ID
  email?: string;
  name?: string;
  picture?: string;
  aud: string; // Client ID
  exp: number; // Expiration time
}