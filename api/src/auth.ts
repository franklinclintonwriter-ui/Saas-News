import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { forbidden, unauthorized } from './errors.js';
import { prisma } from './prisma.js';
import type { AuthUser, Role } from './types.js';
import { hashIp, sha256 } from './utils.js';

type AccessPayload = {
  sub: string;
  email: string;
  role: Role;
};

const roleRank: Record<Role, number> = {
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  EDITOR: 3,
  ADMIN: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    } satisfies Omit<AccessPayload, 'sub'>,
    config.jwtSecret,
    {
      subject: user.id,
      expiresIn: config.accessTokenTtl as jwt.SignOptions['expiresIn'],
      issuer: 'phulpur24-api',
      audience: 'phulpur24-admin',
    },
  );
}

export async function createRefreshToken(input: { userId: string; ip?: string; userAgent?: string }): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash: sha256(token),
      ipHash: hashIp(input.ip),
      userAgent: input.userAgent?.slice(0, 300),
      expiresAt,
    },
  });
  return token;
}

export async function rotateRefreshToken(input: { token: string; ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
  const tokenHash = sha256(input.token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    unauthorized('Invalid refresh token.');
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    status: session.user.status as AuthUser['status'],
  };
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: await createRefreshToken({ userId: user.id, ip: input.ip, userAgent: input.userAgent }),
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.headers.authorization;
    const token = raw?.startsWith('Bearer ') ? raw.slice('Bearer '.length) : null;
    if (!token) unauthorized();

    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'phulpur24-api',
      audience: 'phulpur24-admin',
    }) as AccessPayload & { sub: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== 'ACTIVE') unauthorized();

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      status: user.status as AuthUser['status'],
    };
    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      next(unauthorized('Invalid access token.'));
      return;
    }
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(unauthorized('Access token expired.'));
      return;
    }
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  const minimum = Math.min(...roles.map((role) => roleRank[role]));
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) unauthorized();
    if (roleRank[req.user.role] < minimum) forbidden();
    next();
  };
}

export function requireSelfOrRole(paramName: string, ...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) unauthorized();
    if (req.user.id === req.params[paramName]) {
      next();
      return;
    }
    const minimum = Math.min(...roles.map((role) => roleRank[role]));
    if (roleRank[req.user.role] < minimum) forbidden();
    next();
  };
}
