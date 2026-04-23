export type AdminRole = 'CONTRIBUTOR' | 'AUTHOR' | 'EDITOR' | 'ADMIN';

const ROLE_RANK: Record<AdminRole, number> = {
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  EDITOR: 3,
  ADMIN: 4,
};

function normalizeRole(role: string | null | undefined): AdminRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase();
  if (normalized === 'CONTRIBUTOR' || normalized === 'AUTHOR' || normalized === 'EDITOR' || normalized === 'ADMIN') {
    return normalized;
  }
  return null;
}

export function hasMinimumRole(role: string | null | undefined, required: AdminRole): boolean {
  const current = normalizeRole(role);
  if (!current) return false;
  return ROLE_RANK[current] >= ROLE_RANK[required];
}
