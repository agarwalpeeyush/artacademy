/**
 * Maps a user's granted roles to the workspaces (route trees) they may enter.
 *
 * One human can hold several roles at once (e.g. Teacher + Principal + Parent),
 * so a single login may unlock multiple workspaces. The role switcher in the
 * header uses this to let the user move between them without logging out.
 *
 * ADMIN has no dedicated route tree of its own — its one job is provisioning
 * Principals, which lives under the Principal console — so ADMIN maps to the
 * principal workspace (create-principal landing).
 */
export interface Workspace {
  /** Role that unlocks this workspace, e.g. "ROLE_PRINCIPAL". */
  role: string;
  /** Human label shown in the switcher. */
  label: string;
  /** Base path of the workspace's route tree. */
  base: string;
  /** Where entering this workspace lands the user. */
  home: string;
}

// Order = precedence for the default landing workspace after login.
const WORKSPACE_DEFS: Array<{ roles: string[] } & Omit<Workspace, 'role'>> = [
  { roles: ['ROLE_ADMIN'], label: 'Admin', base: '/principal', home: '/principal/create-principal' },
  { roles: ['ROLE_PRINCIPAL'], label: 'Principal', base: '/principal', home: '/principal/dashboard' },
  { roles: ['ROLE_TEACHER'], label: 'Teacher', base: '/teacher', home: '/teacher/dashboard' },
  { roles: ['ROLE_PARENT'], label: 'Parent', base: '/parent', home: '/parent/dashboard' },
  { roles: ['ROLE_STUDENT'], label: 'Student', base: '/student', home: '/student/dashboard' },
];

/** Workspaces this set of roles unlocks, in precedence order, de-duplicated by base path. */
export const workspacesForRoles = (roles: string[]): Workspace[] => {
  const held = new Set(roles);
  const seenBase = new Set<string>();
  const result: Workspace[] = [];
  for (const def of WORKSPACE_DEFS) {
    if (!def.roles.some(r => held.has(r))) continue;
    if (seenBase.has(def.base)) continue; // ADMIN + PRINCIPAL both map to /principal — keep the first
    seenBase.add(def.base);
    result.push({ role: def.roles[0], label: def.label, base: def.base, home: def.home });
  }
  return result;
};

/** The workspace a user lands in right after login (highest-precedence role). */
export const defaultWorkspace = (roles: string[]): Workspace | null =>
  workspacesForRoles(roles)[0] ?? null;

/** The workspace whose route tree owns the given path, if any. */
export const workspaceForPath = (roles: string[], pathname: string): Workspace | null =>
  workspacesForRoles(roles).find(w => pathname.startsWith(w.base)) ?? null;
