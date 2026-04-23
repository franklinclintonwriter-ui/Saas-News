import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { prisma } from './prisma.js';

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function ok(res: Response, data: unknown, meta?: unknown): void {
  res.json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function created(res: Response, data: unknown): void {
  res.status(201).json({ ok: true, data });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function hashIp(ip: string | undefined): string | undefined {
  return ip ? sha256(ip).slice(0, 32) : undefined;
}

export function safeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    title: user.title ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    location: user.location ?? '',
    websiteUrl: user.websiteUrl ?? '',
    twitterUrl: user.twitterUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    facebookUrl: user.facebookUrl ?? '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function writeAudit(input: {
  actorId?: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  detail?: string;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        detail: input.detail,
        ipHash: hashIp(input.ip),
      },
    });
  } catch (error) {
    console.warn('Audit log write failed:', error instanceof Error ? error.message : error);
  }
}

export const idParamSchema = z.object({
  id: z.string().min(1),
});
