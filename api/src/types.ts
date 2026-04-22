export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
      validatedQuery?: unknown;
    }
  }
}

export {};
