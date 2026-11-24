
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceRole,
  canManageWorkspace,
} from "@/lib/permissions";
import { ProjectStatus } from "@/lib/generated/prisma/enums";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function PATCH(
  _request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get project ID
    const { projectId } = await params;

    // 3. Find project
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, status: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    // 4. Check permissions
    const role = await getWorkspaceRole(
      session.user.id,
      existingProject.workspaceId
    );

    if (!canManageWorkspace(role)) {
      return NextResponse.json(
        { message: "You are not allowed to archive this project." },
        { status: 403 }
      );
    }

    // 5. Prevent repeated archiving
    if (existingProject.status === ProjectStatus.ARCHIVED) {
      return NextResponse.json(
        { message: "Project is already archived." },
        { status: 409 }
      );
    }

    // 6. Archive project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
    });

    return NextResponse.json(
      {
        message: "Project archived successfully.",
        project,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Something went wrong while archiving the project." },
      { status: 500 }
    );
  }
}
