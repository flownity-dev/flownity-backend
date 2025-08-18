declare module 'passport' {
  import { Request, Response, NextFunction } from 'express';

  interface AuthenticateOptions {
    scope?: string | string[];
    failureRedirect?: string;
    successRedirect?: string;
    session?: boolean;
  }

  interface Strategy {
    name?: string;
    authenticate(req: Request, options?: any): void;
  }

  interface PassportStatic {
    use(strategy: Strategy): this;
    use(name: string, strategy: Strategy): this;
    authenticate(strategy: string, options?: AuthenticateOptions): (req: Request, res: Response, next: NextFunction) => void;
    authenticate(strategy: string, callback?: (err: any, user?: any, info?: any) => void): (req: Request, res: Response, next: NextFunction) => void;
    serializeUser<TUser>(fn: (user: TUser, done: (err: any, id?: any) => void) => void): void;
    deserializeUser<TUser>(fn: (id: any, done: (err: any, user?: TUser | null) => void) => void): void;
    initialize(): (req: Request, res: Response, next: NextFunction) => void;
    session(): (req: Request, res: Response, next: NextFunction) => void;
  }

  const passport: PassportStatic;
  export = passport;
}