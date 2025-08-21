/**
 * Token extraction and validation utilities
 */

import type { Request } from 'express';
import { TokenExtractionError, InvalidTokenFormatError } from './errors.js';

/**
 * Extracts Bearer token from Authorization header
 * @param req Express request object
 * @returns Extracted token string
 * @throws TokenExtractionError if no Authorization header is present
 * @throws InvalidTokenFormatError if header format is invalid
 */
export function extractBearerToken(req: Request): string {
  const authHeader = req.headers.authorization;

  // Check if Authorization header is present
  if (!authHeader) {
    throw new TokenExtractionError('Authorization header is required');
  }

  // Validate Bearer token format
  if (!isValidBearerFormat(authHeader)) {
    throw new InvalidTokenFormatError('Authorization header must be in format: Bearer <token>');
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.substring(7); // Remove "Bearer " prefix

  // Validate token is not empty after extraction
  if (!token || token.trim().length === 0) {
    throw new InvalidTokenFormatError('Token cannot be empty');
  }

  return token.trim();
}

/**
 * Validates Authorization header format (Bearer {token} pattern)
 * @param authHeader Authorization header value
 * @returns true if format is valid, false otherwise
 */
export function isValidBearerFormat(authHeader: string): boolean {
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  // Check if header starts with "Bearer " (case-sensitive)
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }

  // Check if there's content after "Bearer "
  const tokenPart = authHeader.substring(7);
  return tokenPart.length > 0;
}

/**
 * Validates token format (non-empty, proper structure)
 * @param token Token string to validate
 * @returns true if token format is valid, false otherwise
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const trimmedToken = token.trim();

  // Token must not be empty
  if (trimmedToken.length === 0) {
    return false;
  }

  // Token must not contain whitespace (tokens should be single strings)
  if (/\s/.test(trimmedToken)) {
    return false;
  }

  // Token must be at least 10 characters (reasonable minimum for OAuth tokens)
  if (trimmedToken.length < 10) {
    return false;
  }

  // Token must contain only valid characters (alphanumeric, hyphens, underscores, dots)
  // This covers most OAuth token formats
  if (!/^[A-Za-z0-9._-]+$/.test(trimmedToken)) {
    return false;
  }

  return true;
}

/**
 * Extracts and validates Bearer token from request
 * @param req Express request object
 * @returns Validated token string
 * @throws TokenExtractionError if extraction fails
 * @throws InvalidTokenFormatError if token format is invalid
 */
export function extractAndValidateToken(req: Request): string {
  const token = extractBearerToken(req);

  if (!isValidTokenFormat(token)) {
    throw new InvalidTokenFormatError('Token format is invalid');
  }

  return token;
}