
import { NextResponse } from "next/server";
import {
  getCurrentUserWorkspaceRole,
  canDeleteWorkspace,
  canManageMembers,
  canCreateProjects,
} from "@/lib/permissions";

export const instant = false;

export async function GET() {
  const workspaceId = "nexora-workspace-main";

  const role = await getCurrentUserWorkspaceRole(workspaceId);

  if (!role) {
    return NextResponse.json(
      { message: "You are not a workspace member." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    role,
    permissions: {
      canManageMembers: canManageMembers(role),
      canCreateProjects: canCreateProjects(role),
      canDeleteWorkspace: canDeleteWorkspace(role),
    },
  });
}
