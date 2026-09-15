export type WorkspaceSlug = 'angelbird' | 'atomos';

export type Workspace = {
  id: string;
  slug: WorkspaceSlug;
  name: string;
  supportLabel: string;
};

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'manager' | 'admin';
};

export type Session = {
  user: AppUser;
  workspace: Workspace;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};
