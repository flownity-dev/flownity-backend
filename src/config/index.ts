import * as dotenv from 'dotenv';
import type { StringValue } from "ms"

// Load environment variables from .env file
// Only load .env in development to avoid overriding production env vars
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: StringValue;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  CALLBACK_URL: string;
  GOOGLE_CALLBACK_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
}

function validateConfig(): AppConfig {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_HOST',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD'
  ];

  // Check for at least one OAuth provider
  const hasGitHub = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.CALLBACK_URL;
  const hasGoogle = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL;

  if (!hasGitHub && !hasGoogle) {
    throw new Error('At least one OAuth provider must be configured (GitHub or Google)');
  }

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as StringValue || '24h',
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    CALLBACK_URL: process.env.CALLBACK_URL || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',
    DATABASE_HOST: process.env.DATABASE_HOST!,
    DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
    DATABASE_NAME: process.env.DATABASE_NAME!,
    DATABASE_USER: process.env.DATABASE_USER!,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD!
  };
}

export const config = validateConfig();