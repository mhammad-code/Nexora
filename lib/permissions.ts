import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  WorkspaceRole,
  type WorkspaceRole as WorkspaceRoleType,
} from "@/lib/generated/prisma/enums";

// Get a user's role in a specific workspace
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRoleType | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role ?? null;
}

// Check workspace access
export function canAccessWorkspace(
  role: WorkspaceRoleType | null
): boolean {
  return role !== null;
}

// Check workspace management permissions
export function canManageWorkspace(
  role: WorkspaceRoleType | null
): boolean {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

// Check member management permissions
export function canManageMembers(
  role: WorkspaceRoleType | null
): boolean {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

// Check project creation permissions
export function canCreateProjects(
  role: WorkspaceRoleType | null
): boolean {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

// Check workspace deletion permissions
export function canDeleteWorkspace(
  role: WorkspaceRoleType | null
): boolean {
  return role === WorkspaceRole.OWNER;
}
// Get the logged-in user's role in a workspace
export async function getCurrentUserWorkspaceRole(
  workspaceId: string
): Promise<WorkspaceRoleType | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return getWorkspaceRole(session.user.id, workspaceId);
}
// Require a specific workspace permission
export async function requireWorkspacePermission(
  workspaceId: string,
  permission: (role: WorkspaceRoleType | null) => boolean
): Promise<boolean> {
  const role = await getCurrentUserWorkspaceRole(workspaceId);

  return permission(role);
}
// Check whether a user belongs to a specific project
export async function isProjectMember(
  userId: string,
  projectId: string
): Promise<boolean> {
  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: {
      id: true,
    },
  });

  return membership !== null;
}
// Check whether a user can access a project
export function canAccessProject(
  role: WorkspaceRoleType | null,
  isMember: boolean
): boolean {
  return (
    role !== null &&
    (
      role === WorkspaceRole.OWNER ||
      role === WorkspaceRole.ADMIN ||
      isMember
    )
  );
}