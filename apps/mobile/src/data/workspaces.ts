import { Workspace, WorkspaceSlug } from '@/types/workspace';

export const WORKSPACES: Record<WorkspaceSlug, Workspace> = {
  angelbird: { id: 'angelbird-local', slug: 'angelbird', name: 'AngelBird', supportLabel: 'AngelBird Support' },
  atomos: { id: 'atomos-local', slug: 'atomos', name: 'Atomos', supportLabel: 'Atomos Support' },
};

export function resolveMockWorkspace(email: string): Workspace {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'shahid@mahimediasolutions.com') return WORKSPACES.atomos;
  return WORKSPACES.angelbird;
}
