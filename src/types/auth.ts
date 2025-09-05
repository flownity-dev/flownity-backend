export interface AuthenticationSuccessResponse {
  success: true;
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    email: string | null;
    provider: string;
    providerId: string;
  };
}

export interface AuthenticationErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
  };
}

export type AuthenticationResponse = AuthenticationSuccessResponse | AuthenticationErrorResponse;

/**
 * Format successful authentication response
 */
export function formatSuccessResponse(token: string, user: any): AuthenticationSuccessResponse {
  return {
    success: true,
    message: 'Authentication successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      provider: user.provider,
      providerId: user.providerId
    }
  };
}

/**
 * Format error authentication response
 */
export function formatErrorResponse(message: string, code: string, errorMessage: string): AuthenticationErrorResponse {
  return {
    success: false,
    message,
    error: {
      code,
      message: errorMessage
    }
  };
}