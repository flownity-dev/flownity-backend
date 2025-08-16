export { default as DatabaseConnection } from './connection.js';
export { initializeDatabase, createUpdateTimestampTrigger } from './init.js';
export type { DatabaseConfig } from './connection.js';
export { User } from '../models/User.js';
export type { GitHubProfile, UserRow } from '../models/User.js';