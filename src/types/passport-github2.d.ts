declare module 'passport-github2' {
  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
  }

  interface Profile {
    id: string;
    username: string;
    displayName: string;
    name?: {
      givenName?: string;
      familyName?: string;
    };
    emails?: Array<{ value: string; verified: boolean }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _raw: string;
    _json: any;
  }

  type VerifyCallback = (error: any, user?: any, info?: any) => void;
  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void;

  export class Strategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}